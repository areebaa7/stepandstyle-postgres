import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import prisma from '@/lib/prisma';
import { AUTH_COOKIE_NAME, verifyAuthToken } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { getStorefrontSettings } from '@/lib/storefrontSettings.server';
import { markAbandonedCartRecovered, subscribeNewsletter } from '@/lib/growth.server';
import { resolveShippingLocation } from '@/lib/shipping';
import { isTrustedReceiptUrl } from '@/lib/uploadSecurity';
import { purchaseEventId, signPurchaseClaim } from '@/lib/purchaseTracking';

type EmailItem = {
  name?: string;
  price: number;
  quantity: number;
  size?: string | null;
  color?: string | null;
};

type EmailOrder = {
  id: string;
  paymentMethod: string;
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  total: number;
  items: EmailItem[];
  shippingName: string;
  shippingAddress: string;
  shippingCity: string;
  shippingRegion: string;
  shippingPostalCode: string | null;
  shippingPhone: string;
};

type RequestedOrderItem = {
  id: string;
  quantity: number;
  size: string | null;
  color: string | null;
};

type StockVariant = {
  id: string | null;
  color: string;
  size: string;
  stock: number;
  imageUrl: string | null;
  images: string[];
};

type InventoryReservation = {
  productId: string;
  productName: string;
  variantId: string | null;
  color: string;
  size: string;
  quantity: number;
};

class InventoryReservationError extends Error {
  reservation: InventoryReservation | null;

  constructor(message: string, reservation: InventoryReservation | null = null) {
    super(message);
    this.name = 'InventoryReservationError';
    this.reservation = reservation;
  }
}

const MAX_ORDER_LINES = 50;
const MAX_QUANTITY_PER_LINE = 100;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{15,127}$/;

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  return null;
}

function hashOrderRequest(body: unknown, userId: string | null) {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize({ body, userId })))
    .digest('hex');
}

function orderResponseData(order: {
  id: string;
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  total: number;
  items: unknown;
}) {
  const items = Array.isArray(order.items) ? order.items : [];
  const itemCount = items.reduce((sum, entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return sum;
    const quantity = Number((entry as Record<string, unknown>).quantity);
    return sum + (Number.isInteger(quantity) && quantity > 0 ? quantity : 0);
  }, 0);
  const productIds = items.flatMap((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
    const id = (entry as Record<string, unknown>).id;
    return typeof id === 'string' && id ? [id] : [];
  });

  return {
    orderId: order.id,
    subtotal: order.subtotal,
    discountAmount: order.discountAmount,
    shippingCost: order.shippingCost,
    total: order.total,
    itemCount,
    productIds,
  };
}

function isUniqueConstraintError(error: unknown) {
  return Boolean(
    error &&
    typeof error === 'object' &&
    (error as Record<string, unknown>).code === 'P2002',
  );
}

async function replayIdempotentOrder(key: string, requestHash: string) {
  const record = await prisma.orderIdempotency.findUnique({ where: { key } });
  if (!record) return null;

  if (record.requestHash !== requestHash) {
    return NextResponse.json(
      {
        success: false,
        code: 'IDEMPOTENCY_KEY_REUSED',
        error: 'This checkout key was already used for a different order request.',
      },
      { status: 409 },
    );
  }

  if (!record.orderId) {
    return NextResponse.json(
      {
        success: false,
        code: 'IDEMPOTENCY_IN_PROGRESS',
        error: 'This order is still being processed. Please retry shortly.',
      },
      { status: 409 },
    );
  }

  const order = await prisma.order.findUnique({
    where: { id: record.orderId },
    select: {
      id: true,
      subtotal: true,
      discountAmount: true,
      shippingCost: true,
      total: true,
      items: true,
    },
  });
  if (!order) {
    return NextResponse.json(
      {
        success: false,
        code: 'IDEMPOTENCY_RECORD_INVALID',
        error: 'The previous order reference could not be recovered. Please contact support.',
      },
      { status: 409 },
    );
  }

  const conversionToken = await signPurchaseClaim(order.id);
  return NextResponse.json({
    success: true,
    replayed: true,
    message: 'Order already created successfully',
    data: { ...orderResponseData(order), conversionToken },
  });
}

function parseRequestedOrderItems(items: unknown[]): RequestedOrderItem[] | null {
  if (items.length === 0 || items.length > MAX_ORDER_LINES) return null;

  const parsed: RequestedOrderItem[] = [];
  for (const entry of items) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
    const item = entry as Record<string, unknown>;
    const id = typeof item.id === 'string' ? item.id.trim() : '';
    const quantity = Number(item.quantity);

    if (
      !id ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_QUANTITY_PER_LINE
    ) {
      return null;
    }

    parsed.push({
      id,
      quantity,
      size: typeof item.size === 'string' ? item.size.trim().slice(0, 30) || null : null,
      color: typeof item.color === 'string' ? item.color.trim().slice(0, 50) || null : null,
    });
  }

  return parsed;
}

function parseStockVariants(value: unknown): StockVariant[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
    const variant = entry as Record<string, unknown>;
    const color = typeof variant.color === 'string' ? variant.color.trim() : '';
    const size = typeof variant.size === 'string' ? variant.size.trim() : '';
    const stock = Number(variant.stock);
    if (!color || !size || !Number.isInteger(stock) || stock < 0) return [];

    return [{
      id: typeof variant.id === 'string' && variant.id.trim() ? variant.id.trim() : null,
      color,
      size,
      stock,
      imageUrl: typeof variant.imageUrl === 'string' && variant.imageUrl.trim()
        ? variant.imageUrl.trim()
        : null,
      images: Array.isArray(variant.images)
        ? variant.images.filter((image): image is string => typeof image === 'string' && Boolean(image.trim()))
        : [],
    }];
  });
}

function variantSelectionKey(value: string | null) {
  return value?.trim().toLocaleLowerCase('en') || '';
}

function rawCommandMatched(result: unknown) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return false;
  const value = (result as Record<string, unknown>).value;
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isRetryableTransactionError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const record = error as Record<string, unknown>;
  const message = typeof record.message === 'string' ? record.message : '';
  return (
    record.code === 'P2034' ||
    message.includes('WriteConflict') ||
    message.includes('TransientTransactionError')
  );
}

async function reserveVariantStock(
  tx: Prisma.TransactionClient,
  reservation: InventoryReservation,
) {
  const product = await tx.product.findUnique({
    where: { id: reservation.productId }
  });

  if (!product || !product.inStock) {
    throw new InventoryReservationError(
      `Stock changed for ${reservation.productName}.`,
      reservation,
    );
  }

  const variants = (product.variants as any[]) || [];
  let found = false;
  let anyInStock = false;

  const updatedVariants = variants.map(v => {
    if (v.color === reservation.color && v.size === reservation.size) {
      if (v.stock < reservation.quantity) {
        throw new InventoryReservationError(
          `Stock changed for ${reservation.productName}.`,
          reservation,
        );
      }
      found = true;
      v.stock -= reservation.quantity;
    }
    if (v.stock > 0) anyInStock = true;
    return v;
  });

  if (!found) {
    throw new InventoryReservationError(
      `Stock changed for ${reservation.productName}.`,
      reservation,
    );
  }

  await tx.product.update({
    where: { id: reservation.productId },
    data: {
      variants: updatedVariants,
      inStock: anyInStock
    }
  });
}

async function verifyLegacyProductAvailability(
  tx: Prisma.TransactionClient,
  productId: string,
  productName: string,
) {
  const product = await tx.product.findUnique({
    where: { id: productId }
  });

  if (!product || !product.inStock) {
    throw new InventoryReservationError(`${productName} is no longer available.`);
  }

  await tx.product.update({
    where: { id: productId },
    data: { updatedAt: new Date() }
  });
}

async function withInventoryTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(operation, { maxWait: 5_000, timeout: 15_000 });
    } catch (error) {
      if (error instanceof InventoryReservationError || !isRetryableTransactionError(error)) {
        throw error;
      }
      lastError = error;
    }
  }
  throw lastError;
}

function buildOrderSummaryEmail({
  title,
  order,
  message,
}: {
  title: string;
  order: EmailOrder;
  message: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>${title}</h2>
      <p>${message}</p>
      <p><strong>Order ID:</strong> ${order.id}</p>
      <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
      <p><strong>Subtotal:</strong> Rs.${Number(order.subtotal).toFixed(2)}</p>
      <p><strong>Discount:</strong> Rs.${Number(order.discountAmount).toFixed(2)}</p>
      <p><strong>Shipping Cost:</strong> Rs.${Number(order.shippingCost).toFixed(2)}</p>
      <p><strong>Total:</strong> Rs.${Number(order.total).toFixed(2)}</p>
      <h3>Items</h3>
      <ul>
        ${order.items
      .map(
        (item: EmailItem) =>
          `<li>${item.name}${item.size ? ` (Size: ${item.size})` : ''}${item.color ? ` (Color: ${item.color})` : ''} × ${item.quantity} — Rs. ${(item.price * item.quantity).toFixed(2)}</li>`,
      )
      .join('')}
      </ul>
      <p><strong>Shipping Address:</strong><br/>
        ${order.shippingName}<br/>
        ${order.shippingAddress}, ${order.shippingCity}, ${order.shippingRegion}<br/>
        ${order.shippingPostalCode}<br/>
        ${order.shippingPhone}
      </p>
    </div>
  `;
}

// GET /api/orders - Get user's orders
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyAuthToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = payload.role === 'ADMIN';
    const requestsAdminScope = request.nextUrl.searchParams.get('scope') === 'all';

    if (requestsAdminScope && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required.' },
        { status: 403 },
      );
    }

    const orders = await prisma.order.findMany({
      where: isAdmin ? undefined : { userId: payload.userId },
      include: {
        promoCode: {
          select: {
            code: true,
            discountPercent: true,
          },
        },
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch orders' }, { status: 500 });
  }
}

// POST /api/orders - Create a new order
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    const payload = token ? await verifyAuthToken(token) : null;

    if (payload?.role === 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Administrators cannot place orders.' },
        { status: 403 },
      );
    }

    const idempotencyKey = request.headers.get('idempotency-key')?.trim() || '';
    if (!IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
      return NextResponse.json(
        {
          success: false,
          code: 'IDEMPOTENCY_KEY_REQUIRED',
          error: 'A valid checkout idempotency key is required.',
        },
        { status: 400 },
      );
    }

    const rawBody: unknown = await request.json();
    if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
      return NextResponse.json(
        { success: false, error: 'Invalid order request.' },
        { status: 400 },
      );
    }
    const requestHash = hashOrderRequest(rawBody, payload?.userId || null);
    const replayResponse = await replayIdempotentOrder(idempotencyKey, requestHash);
    if (replayResponse) return replayResponse;

    const body = rawBody as Record<string, unknown>;
    const items = body.items;
    const rawShippingAddress = body.shippingAddress &&
      typeof body.shippingAddress === 'object' &&
      !Array.isArray(body.shippingAddress)
      ? body.shippingAddress as Record<string, unknown>
      : {};
    const shippingAddress = {
      fullName: typeof rawShippingAddress.fullName === 'string' ? rawShippingAddress.fullName.trim() : '',
      email: typeof rawShippingAddress.email === 'string' ? rawShippingAddress.email.trim() : '',
      phone: typeof rawShippingAddress.phone === 'string' ? rawShippingAddress.phone.trim() : '',
      address: typeof rawShippingAddress.address === 'string' ? rawShippingAddress.address.trim() : '',
      postalCode: typeof rawShippingAddress.postalCode === 'string'
        ? rawShippingAddress.postalCode.trim()
        : '',
      newsletters: rawShippingAddress.newsletters === true,
    };
    const paymentMethod = typeof body.paymentMethod === 'string' ? body.paymentMethod : '';
    const directAccount = typeof body.directAccount === 'string' ? body.directAccount : null;
    const promoCodeId = typeof body.promoCodeId === 'string' && body.promoCodeId
      ? body.promoCodeId
      : null;
    const receiptUrl = typeof body.receiptUrl === 'string' && body.receiptUrl ? body.receiptUrl : null;
    const shippingRegion = typeof body.shippingRegion === 'string' ? body.shippingRegion : '';
    const shippingCity = typeof body.shippingCity === 'string' ? body.shippingCity : '';
    const shippingMode = body.shippingMode;
    const shippingRegionId = body.shippingRegionId;
    const shippingCityId = body.shippingCityId;

    if (!items || !Array.isArray(items) || !items.length) {
      return NextResponse.json({ success: false, error: 'Cart is empty' }, { status: 400 });
    }

    const requestedItems = parseRequestedOrderItems(items);
    if (!requestedItems) {
      return NextResponse.json(
        {
          success: false,
          code: 'INVALID_ITEMS',
          error: `Each order line needs a valid product and a whole-number quantity between 1 and ${MAX_QUANTITY_PER_LINE}.`,
        },
        { status: 400 },
      );
    }

    if (
      !shippingAddress ||
      !shippingAddress.fullName ||
      !shippingAddress.email ||
      !shippingAddress.phone ||
      !shippingAddress.address
    ) {
      return NextResponse.json({ success: false, error: 'Shipping details are incomplete.' }, { status: 400 });
    }

    if (!paymentMethod || !['cod', 'direct'].includes(paymentMethod)) {
      return NextResponse.json({ success: false, error: 'Invalid payment method.' }, { status: 400 });
    }
    if (paymentMethod === 'direct' && (!receiptUrl || !isTrustedReceiptUrl(receiptUrl))) {
      return NextResponse.json(
        { success: false, code: 'INVALID_RECEIPT', error: 'A valid uploaded payment receipt is required.' },
        { status: 400 },
      );
    }
    const trustedReceiptUrl = paymentMethod === 'direct' ? receiptUrl : null;

    const productIds = Array.from(new Set(requestedItems.map((item) => item.id)));
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        title: true,
        price: true,
        discount: true,
        image: true,
        inStock: true,
        variants: true,
      },
    });
    const productMap = new Map(products.map((product) => [product.id, product]));

    if (productMap.size !== productIds.length) {
      return NextResponse.json(
        {
          success: false,
          code: 'PRODUCT_NOT_FOUND',
          error: 'One or more products are no longer available.',
        },
        { status: 400 },
      );
    }

    const sanitizedItems: Array<{
      id: string;
      variantId: string | null;
      name: string;
      price: number;
      quantity: number;
      image: string | null;
      size: string | null;
      color: string | null;
    }> = [];
    const inventoryReservations = new Map<string, InventoryReservation>();
    const legacyProducts = new Map<string, string>();

    for (const item of requestedItems) {
      const product = productMap.get(item.id)!;
      if (!product.inStock) {
        return NextResponse.json(
          {
            success: false,
            code: 'OUT_OF_STOCK',
            productId: product.id,
            error: `${product.title} is currently out of stock.`,
          },
          { status: 409 },
        );
      }

      const variants = parseStockVariants(product.variants);
      const configuredVariantCount = Array.isArray(product.variants) ? product.variants.length : 0;
      if (configuredVariantCount > 0 && variants.length !== configuredVariantCount) {
        return NextResponse.json(
          {
            success: false,
            code: 'PRODUCT_CONFIGURATION_ERROR',
            productId: product.id,
            error: `${product.title} has invalid inventory configuration and cannot be ordered right now.`,
          },
          { status: 409 },
        );
      }
      let selectedVariant: StockVariant | null = null;
      if (variants.length > 0) {
        const selectedColor = variantSelectionKey(item.color);
        const selectedSize = variantSelectionKey(item.size);

        selectedVariant = variants.find(
          (variant) =>
            variantSelectionKey(variant.color) === selectedColor &&
            variantSelectionKey(variant.size) === selectedSize,
        ) || null;

        if (selectedVariant) {
          const stockKey = `${product.id}::${variantSelectionKey(selectedVariant.color)}::${variantSelectionKey(selectedVariant.size)}`;
          const existingReservation = inventoryReservations.get(stockKey);
          const totalRequested = (existingReservation?.quantity || 0) + item.quantity;
          inventoryReservations.set(stockKey, {
            productId: product.id,
            productName: product.title,
            variantId: selectedVariant.id,
            color: selectedVariant.color,
            size: selectedVariant.size,
            quantity: totalRequested,
          });
          if (totalRequested > selectedVariant.stock) {
            return NextResponse.json(
              {
                success: false,
                code: 'INSUFFICIENT_STOCK',
                productId: product.id,
                variantId: selectedVariant.id,
                availableStock: selectedVariant.stock,
                error: selectedVariant.stock === 0
                  ? `${product.title} (${selectedVariant.color} / ${selectedVariant.size}) is out of stock.`
                  : `Only ${selectedVariant.stock} of ${product.title} (${selectedVariant.color} / ${selectedVariant.size}) are available.`,
              },
              { status: 409 },
            );
          }
        }
      } else {
        legacyProducts.set(product.id, product.title);
      }

      const basePrice = Number(product.price);
      const rawDiscount = Number(product.discount);
      const discount = Number.isFinite(rawDiscount)
        ? Math.min(100, Math.max(0, rawDiscount))
        : 0;
      const unitPrice = discount > 0
        ? Math.round(basePrice * (1 - discount / 100))
        : roundMoney(basePrice);

      sanitizedItems.push({
        id: product.id,
        variantId: selectedVariant?.id || null,
        name: product.title,
        price: unitPrice,
        quantity: item.quantity,
        image: selectedVariant?.imageUrl || selectedVariant?.images[0] || product.image,
        size: selectedVariant?.size || item.size || null,
        color: selectedVariant?.color || item.color || null,
      });
    }
    const numericSubtotal = roundMoney(
      sanitizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    );

    if (!Number.isFinite(numericSubtotal) || numericSubtotal <= 0) {
      return NextResponse.json(
        { success: false, error: 'One or more products have invalid pricing.' },
        { status: 409 },
      );
    }

    const shippingResolution = await resolveShippingLocation({
      mode: shippingMode,
      regionId: shippingRegionId,
      cityId: shippingCityId,
      regionName: shippingRegion,
      cityName: shippingCity,
    });
    if (!shippingResolution.success) {
      return NextResponse.json(
        {
          success: false,
          code: shippingResolution.code,
          error: shippingResolution.error,
        },
        { status: 400 },
      );
    }
    const normalizedShippingRegion = shippingResolution.location.region;
    const normalizedShippingCity = shippingResolution.location.city;

    const normalizedMethod = paymentMethod === 'direct' ? 'DIRECT' : 'COD';

    let promoCode = null;
    if (promoCodeId) {
      promoCode = await prisma.promoCode.findUnique({
        where: { id: promoCodeId },
        include: {
          influencer: {
            include: {
              user: { select: { email: true } },
            },
          },
        },
      });
      if (!promoCode) {
        return NextResponse.json({ success: false, error: 'Invalid promo code.' }, { status: 400 });
      }
if (promoCode.validUntil < new Date()) {
        return NextResponse.json({ success: false, error: 'Promo code has expired.' }, { status: 400 });
      }
      if (promoCode.usageLimit !== null && promoCode.usageCount >= promoCode.usageLimit) {
        return NextResponse.json(
          { success: false, error: 'This promo code has reached its usage limit and is no longer available.' },
          { status: 400 },
        );
      }
      if (promoCode.influencer) {
        const latestApplication = await prisma.affiliateApplication.findFirst({
          where: { email: promoCode.influencer.user.email },
          orderBy: { createdAt: 'desc' },
        });
        const applicationBlocksCode = latestApplication && latestApplication.status !== 'APPROVED';
        if (promoCode.influencer.status !== 'ACTIVE' || applicationBlocksCode) {
          return NextResponse.json({ success: false, error: 'Promo code is not available.' }, { status: 400 });
        }
      }
    }

    const promoPercent = promoCode?.discountPercent ?? 0;
    const promoAmount = roundMoney((numericSubtotal * promoPercent) / 100);
    const afterPromo = roundMoney(Math.max(0, numericSubtotal - promoAmount));
    const storefrontSettings = await getStorefrontSettings();
    if (normalizedMethod === 'DIRECT' && !storefrontSettings.manualPaymentAvailable) {
      return NextResponse.json(
        {
          success: false,
          code: 'PAYMENT_METHOD_UNAVAILABLE',
          error: 'Manual payment is not currently available.',
        },
        { status: 400 },
      );
    }
    const bankTransferDiscount = normalizedMethod === 'DIRECT'
      ? roundMoney(afterPromo * (storefrontSettings.bankTransferDiscountPercent / 100))
      : 0;
    const numericPromoDiscount = roundMoney(promoAmount + bankTransferDiscount);
    const numericShippingCost = normalizedMethod === 'DIRECT'
      ? 0
      : shippingResolution.location.shippingCost;
    const numericTotal = roundMoney(
      Math.max(0, afterPromo - bankTransferDiscount + numericShippingCost),
    );

    let order;
    try {
      order = await withInventoryTransaction(async (tx) => {
        await tx.orderIdempotency.create({
          data: {
            key: idempotencyKey,
            requestHash,
          },
        });

        for (const reservation of inventoryReservations.values()) {
          await reserveVariantStock(tx, reservation);
        }
        for (const [productId, productName] of legacyProducts) {
          await verifyLegacyProductAvailability(tx, productId, productName);
        }

        const createdOrder = await tx.order.create({
          data: {
            user: payload?.userId ? { connect: { id: payload.userId } } : undefined,
            promoCode: promoCodeId ? { connect: { id: promoCodeId } } : undefined,
            subtotal: numericSubtotal,
            discountAmount: numericPromoDiscount,
            shippingCost: numericShippingCost,
            total: numericTotal,
            paymentMethod: normalizedMethod,
            paymentStatus: 'PENDING',
            paymentIntentId: null,
            receiptUrl: trustedReceiptUrl,
            directAccount: directAccount || null,
            shippingName: shippingAddress.fullName,
            shippingEmail: shippingAddress.email,
            shippingPhone: shippingAddress.phone,
            shippingAddress: shippingAddress.address,
            shippingCity: normalizedShippingCity,
            shippingRegion: normalizedShippingRegion,
            shippingPostalCode: shippingAddress.postalCode,
            items: sanitizedItems,
          },
          include: {
            promoCode: {
              select: {
                code: true,
                discountPercent: true,
              },
            },
          },
        });

        await tx.marketingEvent.create({
          data: {
            id: purchaseEventId(createdOrder.id),
            eventName: 'Purchase',
            url: '/order-success',
            eventData: {
              orderId: createdOrder.id,
              value: numericTotal,
              currency: 'PKR',
              numItems: sanitizedItems.reduce((sum, item) => sum + item.quantity, 0),
              contentIds: sanitizedItems.map((item) => item.id),
              paymentMethod: normalizedMethod,
              source: 'server-order-transaction',
            },
          },
        });

        if (promoCode) {
          await tx.promoCode.update({
            where: { id: promoCode.id },
            data: {
              usageCount: { increment: 1 },
              totalGrossSales: { increment: numericSubtotal },
              totalDiscount: { increment: numericPromoDiscount },
            },
          });
        }

        await tx.orderIdempotency.update({
          where: { key: idempotencyKey },
          data: { orderId: createdOrder.id },
        });

        return createdOrder;
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const duplicateResponse = await replayIdempotentOrder(idempotencyKey, requestHash);
        if (duplicateResponse) return duplicateResponse;
      }
      if (error instanceof InventoryReservationError) {
        return NextResponse.json(
          {
            success: false,
            code: 'INVENTORY_CHANGED',
            productId: error.reservation?.productId,
            variantId: error.reservation?.variantId,
            error: 'Inventory changed during checkout. Please review your cart and try again.',
          },
          { status: 409 },
        );
      }
      if (isRetryableTransactionError(error)) {
        return NextResponse.json(
          {
            success: false,
            code: 'INVENTORY_CHANGED',
            error: 'Inventory is busy or changed during checkout. Please review your cart and try again.',
          },
          { status: 409 },
        );
      }
      throw error;
    }

    const growthTasks: Promise<unknown>[] = [];
    if (shippingAddress.newsletters) {
      const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
      growthTasks.push(subscribeNewsletter({
        email: order.shippingEmail,
        source: 'checkout',
        consent: true,
        ipAddress: forwardedFor || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      }));
    }
    if (payload?.userId) {
      growthTasks.push(markAbandonedCartRecovered(payload.userId));
    }
    if (growthTasks.length > 0) {
      const growthResults = await Promise.allSettled(growthTasks);
      growthResults.forEach((result) => {
        if (result.status === 'rejected') console.warn('Growth integration task failed:', result.reason);
      });
    }

    await sendEmail({
      to: order.shippingEmail,
      subject: 'We received your Step & Styl order',
      html: buildOrderSummaryEmail({
        title: 'Order received!',
        order: { ...order, items: sanitizedItems },
        message: paymentMethod === 'direct'
          ? 'Your Online Payment order has been received. We will verify your payment receipt and process your order shortly.'
          : 'Your Cash on Delivery order has been received. Our team will prepare it for delivery shortly.',
      }),
    });

    const conversionToken = await signPurchaseClaim(order.id);
    return NextResponse.json(
      {
        success: true,
        message: 'Order created successfully',
        data: { ...orderResponseData({ ...order, items: sanitizedItems }), conversionToken },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ success: false, error: 'Failed to create order' }, { status: 500 });
  }
}
