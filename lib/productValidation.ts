import type { ProductPayload, ProductVariant } from '@/types/product';

const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter((entry) => entry.length > 0);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  return [];
};

const toObject = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return {};
    }
  }

  return {};
};

export function parseProductPayload(
  rawBody: unknown,
  {
    requireSlug = true,
    allowPartial = false,
  }: {
    requireSlug?: boolean;
    allowPartial?: boolean;
  } = {},
): { data: ProductPayload; error?: string } {
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return { data: {}, error: 'Invalid payload.' };
  }

  const body = rawBody as Record<string, unknown>;
  const data: ProductPayload = {};

  if (requireSlug && (body.slug === undefined || body.slug === null || String(body.slug).trim() === '')) {
    return { data: {}, error: 'Slug is required.' };
  }

  if (body.slug !== undefined && body.slug !== null) {
    const rawSlug = String(body.slug).trim();
    if (!rawSlug) {
      if (requireSlug) return { data: {}, error: 'Slug is required.' };
    } else {
      const normalized = toSlug(rawSlug);
      if (!normalized) {
        return { data: {}, error: 'Slug must contain alphanumeric characters.' };
      }
      data.slug = normalized;
    }
  }

  // Robustly handle gender parsing without overwriting with hardcoded defaults
  if (body.gender !== undefined && body.gender !== null) {
    const cleanGender = String(body.gender).trim().toLowerCase();
    if (['men', 'women', 'kids'].includes(cleanGender)) {
      data.gender = cleanGender;
    } else {
      data.gender = 'men';
    }
  } else if (!allowPartial) {
    data.gender = 'men';
  }

  // Robustly handle category parsing matching the selected section without cross-defaults
  if (body.category !== undefined && body.category !== null) {
    const cleanCategory = String(body.category).trim().toLowerCase();
    const defaultCat = data.gender === 'women' ? 'casual' : data.gender === 'kids' ? 'kids' : 'sneakers';
    data.category = cleanCategory || defaultCat;
  } else if (!allowPartial) {
    data.category = data.gender === 'women' ? 'casual' : data.gender === 'kids' ? 'kids' : 'sneakers';
  }

  const requiredFields: Array<{
    key: 'title' | 'description' | 'shortDescription';
    label: string;
  }> = [
    { key: 'title', label: 'Product title' },
    { key: 'description', label: 'Description' },
    { key: 'shortDescription', label: 'Short description' },
  ];

  for (const field of requiredFields) {
    if (body[field.key] !== undefined) {
      const value = String(body[field.key]).trim();
      if (!value) {
        return { data: {}, error: `${field.label} cannot be empty.` };
      }
      data[field.key] = value;
    } else if (!allowPartial) {
      return { data: {}, error: `${field.label} is required.` };
    }
  }

  if (body.price !== undefined) {
    const price = Number(body.price);
    if (Number.isNaN(price) || price <= 0) {
      return { data: {}, error: 'Price must be a positive number.' };
    }
    data.price = price;
  } else if (!allowPartial) {
    return { data: {}, error: 'Price is required.' };
  }

  if (body.salePrice !== undefined && body.salePrice !== null && body.salePrice !== '') {
    const salePrice = Number(body.salePrice);
    if (Number.isNaN(salePrice) || salePrice <= 0) {
      return { data: {}, error: 'Sale price must be a positive number.' };
    }
    data.salePrice = salePrice;
  } else if (body.salePrice === null || body.salePrice === '') {
    data.salePrice = null;
  }
  
  if (body.discount !== undefined && body.discount !== null && body.discount !== '') {
    const discount = Number(body.discount);
    if (Number.isNaN(discount) || discount < 0) {
      return { data: {}, error: 'Discount must be a non-negative number.' };
    }
    data.discount = discount;
  } else {
    data.discount = 0;
  }

  if (body.inStock !== undefined) {
    data.inStock = Boolean(body.inStock);
  }

  if (body.image !== undefined) {
    const imageValue = String(body.image ?? '').trim();
    data.image = imageValue ? imageValue : null;
  }

  if (body.images !== undefined) {
    data.images = toStringArray(body.images);
  }

  if (body.colors !== undefined) {
    data.colors = toStringArray(body.colors);
  }

  if (body.videoUrl !== undefined) {
    const videoValue = String(body.videoUrl ?? '').trim();
    data.videoUrl = videoValue ? videoValue : null;
  }

  if (body.advantages !== undefined) {
    data.advantages = toStringArray(body.advantages);
  }

  if (body.features !== undefined) {
    data.features = toStringArray(body.features);
  }

  if (body.specifications !== undefined) {
    data.specifications = toObject(body.specifications);
  }

  if (body.variants !== undefined) {
    if (!Array.isArray(body.variants)) {
      return { data: {}, error: 'Variants must be an array.' };
    }

    const variants: ProductVariant[] = [];
    const combinations = new Set<string>();

    for (let index = 0; index < body.variants.length; index += 1) {
      const rawVariant = body.variants[index];
      if (!rawVariant || typeof rawVariant !== 'object' || Array.isArray(rawVariant)) {
        return { data: {}, error: `Variant ${index + 1} is invalid.` };
      }

      const variant = rawVariant as Record<string, unknown>;
      const color = String(variant.color ?? '').trim();
      const size = String(variant.size ?? '').trim();
      if (!color || !size) {
        return { data: {}, error: `Variant ${index + 1} requires both a color and size.` };
      }

      const stock = Number(variant.stock);
      if (!Number.isInteger(stock) || stock < 0) {
        return { data: {}, error: `Stock for ${color} / ${size} must be a non-negative whole number.` };
      }

      const combination = `${color.toLowerCase()}::${size.toLowerCase()}`;
      if (combinations.has(combination)) {
        return { data: {}, error: `Duplicate variant: ${color} / ${size}.` };
      }
      combinations.add(combination);

      variants.push({
        id: String(variant.id || `${color}-${size}`),
        color,
        size,
        stock,
        imageUrl: variant.imageUrl ? String(variant.imageUrl).trim() : undefined,
        images: Array.isArray(variant.images)
          ? variant.images.map((image) => String(image).trim()).filter(Boolean)
          : undefined,
        videoUrl: variant.videoUrl ? String(variant.videoUrl).trim() : undefined,
      });
    }

    data.variants = variants;
  }

  if (body.collectionId !== undefined) {
    const collId = String(body.collectionId ?? '').trim();
    data.collectionId = collId || null;
  }

  return { data };
}