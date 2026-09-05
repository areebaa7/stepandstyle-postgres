import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { ensureProductsSeeded, serializeProduct } from '@/lib/products';
import { sendMarketingEmails, buildPromoEmail } from '@/lib/email';
import { AUTH_COOKIE_NAME, verifyAuthToken } from '@/lib/auth';
import { parseProductPayload } from '@/lib/productValidation';

function toJsonInput(value: unknown) {
  return value === undefined ? undefined : (value as Prisma.InputJsonValue);
}

async function requireAdmin(request: NextRequest) {
  const token =
    request.cookies.get(AUTH_COOKIE_NAME)?.value ||
    request.headers.get('Authorization')?.replace('Bearer ', '') ||
    null;

  if (!token) {
    return null;
  }

  const payload = await verifyAuthToken(token);
  if (!payload || payload.role !== 'ADMIN') {
    return null;
  }

  return payload;
}

// GET /api/products - Get all products
export async function GET(request: NextRequest) {
  try {
    try {
      await ensureProductsSeeded();
    } catch (seedErr) {
      console.warn('Seed check skipped or failed:', seedErr);
    }

    const searchParams = request.nextUrl.searchParams;
    const collectionSlug = searchParams.get('collection');
    const collectionId = searchParams.get('collectionId');
    const inStock = searchParams.get('inStock');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const sort = searchParams.get('sort');
    const search = searchParams.get('search');
    const category = searchParams.get('category');

    const where: any = {};
    if (category && category !== 'ALL') {
      where.category = category.toUpperCase();
    }
    if (collectionSlug) {
      where.collection = { slug: { equals: collectionSlug, mode: 'insensitive' } };
    }
    if (collectionId) {
      where.collectionId = collectionId;
    }
    if (inStock === 'true') {
      where.inStock = true;
    } else if (inStock === 'false') {
      where.inStock = false;
    }

    const isNew = searchParams.get('isNew') === 'true';
    const isTrending = searchParams.get('isTrending') === 'true';
    const onSale = searchParams.get('onSale') === 'true';

    if (isNew) {
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      where.createdAt = { gte: fifteenDaysAgo };
    }

    if (onSale) {
      const activeEvents = await prisma.saleEvent.findMany({
        where: { isActive: true }
      });

      if (activeEvents.length > 0) {
        const targetCollections = new Set<string>();
        const targetProducts = new Set<string>();

        for (const event of activeEvents) {
          for (const colId of (event.targetCollections as string[]) || []) {
            targetCollections.add(colId);
          }
          for (const prodId of (event.targetProducts as string[]) || []) {
            targetProducts.add(prodId);
          }
        }

        const orConditions: any[] = [];
        if (targetCollections.size > 0) {
          orConditions.push({ collectionId: { in: [...targetCollections] } });
        }
        if (targetProducts.size > 0) {
          orConditions.push({ id: { in: [...targetProducts] } });
        }

        if (orConditions.length > 0) {
          where.AND = [
            ...(where.AND || []),
            { OR: orConditions }
          ];
        } else {
          where.id = 'non-existent-id-to-return-none';
        }
      } else {
        where.discount = { gt: 0 };
      }
    }

    if (isTrending) {
      where.OR = [
        ...(where.OR || []),
        { saleCount: { gt: 10 } },
        { rating: { gt: 4.0 } }
      ];
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { shortDescription: { contains: search, mode: 'insensitive' } },
      ];
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'price-asc') {
      orderBy = { price: 'asc' };
    } else if (sort === 'price-desc') {
      orderBy = { price: 'desc' };
    } else if (sort === 'newest') {
      orderBy = { createdAt: 'desc' };
    } else if (sort === 'trending') {
      orderBy = [
        { saleCount: 'desc' },
        { rating: 'desc' },
        { createdAt: 'desc' }
      ];
    }

    const products = await prisma.product.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy,
      include: { collection: true },
    });

    // Ensure serialized items include explicit sizes & colors arrays for frontend rendering
    const formattedData = products.map((product) => {
      const baseSerialized = serializeProduct(product);
      
      // Extract sizes safely from variants or specification fields if missing in serializer
      let parsedSizes = (product as any).sizes;
      if (!parsedSizes || !Array.isArray(parsedSizes) || parsedSizes.length === 0) {
        if (Array.isArray(product.variants)) {
          parsedSizes = product.variants.map((v: any) => v.size).filter(Boolean);
        }
      }
      if (!parsedSizes || parsedSizes.length === 0) {
        parsedSizes = ['36', '37', '38', '39', '40', '41', '42']; // Safe footwear default
      }

      return {
        ...baseSerialized,
        sizes: parsedSizes,
        colors: Array.isArray(product.colors) && product.colors.length > 0 ? product.colors : ['#1F2937'],
        images: Array.isArray(product.images) && product.images.length > 0 ? product.images : [product.image].filter(Boolean),
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedData,
      count: formattedData.length,
    });
  } catch (error) {
    console.error('Error fetching products API:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch products' }, { status: 500 });
  }
}

// POST /api/products - Create a new product (Admin only)
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { data, error } = parseProductPayload(body, { requireSlug: true, allowPartial: false });

    if (error) {
      console.warn('Product validation failed:', error, 'Payload:', body);
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    const existingProduct = await prisma.product.findUnique({ where: { slug: data.slug } });
    if (existingProduct) {
      return NextResponse.json(
        { success: false, error: 'A product with this slug already exists. Please choose a different identifier.' },
        { status: 409 }
      );
    }

    const product = await prisma.product.create({
      data: {
        slug: data.slug!,
        category: data.category || 'ALL',
        title: data.title!,
        description: data.description!,
        shortDescription: data.shortDescription!,
        price: data.price!,
        salePrice: data.salePrice ?? null,
        discount: data.discount ?? 0,
        inStock: data.inStock ?? true,
        image: data.image ?? null,
        images: data.images ?? [],
        colors: data.colors ?? [],
        videoUrl: data.videoUrl ?? null,
        advantages: toJsonInput(data.advantages ?? []),
        specifications: toJsonInput(data.specifications ?? {}),
        features: toJsonInput(data.features ?? []),
        variants: toJsonInput(data.variants ?? []),
        collectionId: data.collectionId ?? null,
      },
      include: { collection: true },
    });

    if (body.sendPromoEmail) {
      const subscribers = await prisma.newsletterSubscriber.findMany({
        where: { status: 'SUBSCRIBED' },
        select: { email: true, unsubscribeToken: true },
      });
      
      if (subscribers.length > 0) {
        const html = buildPromoEmail(
          'New Arrival at Step & Style!',
          `We just added an amazing new product: <strong>${product.title}</strong>. Check it out now before it sells out!`,
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/products/${product.slug}`,
          'Shop Now'
        );
        sendMarketingEmails({
          recipients: subscribers,
          subject: `New Arrival: ${product.title}`,
          html,
        }).catch(err => console.error('Background promo email error:', err));
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: serializeProduct(product),
      },
      { status: 201 },
    );
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Slug already exists. Please choose a different identifier.' },
        { status: 409 },
      );
    }

    console.error('Error creating product:', error);
    return NextResponse.json({ success: false, error: 'Failed to create product' }, { status: 500 });
  }
}