export type Gender = 'MEN' | 'WOMEN' | 'KIDS' | 'UNISEX';

export interface CollectionDTO {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  targetGender: Gender;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  color: string;
  size: string;
  stock: number;
  imageUrl?: string;
  images?: string[];
  videoUrl?: string;
}

export interface ProductDTO {
  id: string;
  slug: string;
  category: string;
  gender: string;
  title: string;
  description: string;
  shortDescription: string;
  price: number;
  salePrice: number | null;
  inStock: boolean;
  image: string | null;
  images: string[];
  colors: string[];
  videoUrl: string | null;
  advantages: string[];
  specifications: Record<string, unknown>;
  features: string[];
  variants: ProductVariant[];
  collectionId: string | null;
  collection?: CollectionDTO | null;
  rating: number;
  saleCount: number;
  isNew: boolean;
  isTrending: boolean;
  discount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPayload {
  slug?: string;
  category?: string;
  gender?: string;
  title?: string;
  description?: string;
  shortDescription?: string;
  price?: number;
  salePrice?: number | null;
  discount?: number | null;
  inStock?: boolean;
  image?: string | null;
  images?: string[];
  colors?: string[];
  videoUrl?: string | null;
  advantages?: string[];
  specifications?: Record<string, unknown>;
  features?: string[];
  variants?: ProductVariant[];
  collectionId?: string | null;
}
