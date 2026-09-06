'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { formatPKR } from '@/lib/currency';
import type { ProductDTO, CollectionDTO, ProductVariant } from '@/types/product';
import FileUpload from './FileUpload';
import MultiFileUpload from './MultiFileUpload';
import { resolveColorCode, nearestColorName } from '@/lib/colors';
import { AdminEmptyState, AdminLoadingState, AdminNotice } from './AdminAsyncState';
import { AdminFilterSearch, AdminFilterSelect } from './AdminFilterControl';
import AdminPagination from './AdminPagination';

const PRODUCTS_PAGE_SIZE = 12;

interface ProductFormState {
  slug: string; category: string; gender: string; colors: string[];
  title: string;
  collectionId: string;
  price: string;
  salePrice: string;
  shortDescription: string;
  description: string;
  image: string;
  images: string;
  videoUrl: string;
  advantages: string;
  features: string;
  specifications: string;
  variants: ProductVariant[];
  inStock: boolean;
  discount: string;
  sendPromoEmail: boolean;
}

interface MatrixColor {
  name: string;
  imageUrl?: string;
  images?: string;
  videoUrl?: string;
}

interface ImageAssignment {
  url: string;
  color: string;
}

const buildColorsFromAssignments = (
  assignments: ImageAssignment[],
  previous: MatrixColor[] = [],
): MatrixColor[] => {
  const byColor = new Map<string, { name: string; urls: string[] }>();
  assignments.forEach(({ url, color }) => {
    const name = color.trim();
    if (!name || !url) return;
    const key = name.toLowerCase();
    const entry = byColor.get(key);
    if (entry) {
      if (!entry.urls.includes(url)) entry.urls.push(url);
    } else {
      byColor.set(key, { name, urls: [url] });
    }
  });
  return Array.from(byColor.values()).map(({ name, urls }) => ({
    name,
    imageUrl: urls[0],
    images: urls.join(', '),
    videoUrl: previous.find((c) => c.name.toLowerCase() === name.toLowerCase())?.videoUrl,
  }));
};

const SIZE_PRESETS = [
  { label: 'Shoes 36–42', value: '36, 37, 38, 39, 40, 41, 42' },
  { label: 'Shoes 39–45', value: '39, 40, 41, 42, 43, 44, 45' },
  { label: 'Apparel S–XL', value: 'S, M, L, XL' },
];

const defaultFormState: ProductFormState = {
  slug: '', category: 'sneakers', gender: 'men', colors: [],
  title: '',
  collectionId: '',
  price: '',
  salePrice: '',
  shortDescription: '',
  description: '',
  image: '',
  images: '',
  videoUrl: '',
  advantages: '',
  features: '',
  specifications: '',
  variants: [],
  inStock: true,
  discount: '0',
  sendPromoEmail: false,
};

const specsToString = (value?: Record<string, unknown> | null) => 
  value ? Object.entries(value).map(([k, v]) => `${k}: ${v}`).join('\n') : '';

const specsToObject = (value: string) => {
  const obj: Record<string, string> = {};
  value.split('\n').forEach(line => {
    const [key, ...valParts] = line.split(':');
    if (key && valParts.length > 0) {
      obj[key.trim()] = valParts.join(':').trim();
    }
  });
  return obj;
};

const csvFromArray = (value?: string[] | null) => (value && value.length ? value.join(', ') : '');

const csvToArray = (value: string) =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

interface AdminProductsPanelProps {
  onProductsCountChange?: (count: number) => void;
}

type ProductSort = 'NEWEST' | 'NAME' | 'PRICE_ASC' | 'PRICE_DESC' | 'STOCK_ASC' | 'STOCK_DESC';

const productStock = (product: ProductDTO) =>
  (product.variants || []).reduce((total, variant) => total + Math.max(0, variant.stock || 0), 0);

const genderLabels: Record<string, string> = {
  WOMEN: 'Women',
  MEN: 'Men',
  KIDS: 'Kids',
  UNISEX: 'Unisex',
};

export default function AdminProductsPanel({ onProductsCountChange }: AdminProductsPanelProps) {
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [collections, setCollections] = useState<CollectionDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<{ type: 'idle' | 'error' | 'success'; message: string }>({
    type: 'idle',
    message: '',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [formValues, setFormValues] = useState<ProductFormState>(defaultFormState);
  const [selectedProduct, setSelectedProduct] = useState<ProductDTO | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [collectionFilter, setCollectionFilter] = useState('ALL');
  const [genderFilter, setGenderFilter] = useState('ALL');
  const [stockFilter, setStockFilter] = useState('ALL');
  const [featureFilter, setFeatureFilter] = useState('ALL');
  const [sort, setSort] = useState<ProductSort>('NEWEST');
  const [page, setPage] = useState(1);

  // Variant Matrix State
  const [matrixColors, setMatrixColors] = useState<MatrixColor[]>([]);
  const [imageAssignments, setImageAssignments] = useState<ImageAssignment[]>([]);
  const [matrixSizes, setMatrixSizes] = useState<string>('');
  const [matrixStock, setMatrixStock] = useState<Record<string, number>>({});
  const [matrixVariantImages, setMatrixVariantImages] = useState<Record<string, string>>({});
  const [bulkStock, setBulkStock] = useState('');
  const matrixSizeList = useMemo(() => Array.from(new Set(csvToArray(matrixSizes))), [matrixSizes]);

  const availableCollections = useMemo(() => {
    const usedIds = new Set(products.map((product) => product.collectionId).filter(Boolean));
    return collections.filter((collection) => usedIds.has(collection.id)).sort((left, right) => left.name.localeCompare(right.name));
  }, [collections, products]);

  const availableGenders = useMemo(() => Array.from(new Set(
    products.map((product) => product.collection?.targetGender).filter((value): value is NonNullable<typeof value> => Boolean(value)),
  )).sort(), [products]);

  const availableStockFilters = useMemo(() => [
    ...(products.some((product) => product.inStock) ? [{ value: 'IN_STOCK', label: 'In stock' }] : []),
    ...(products.some((product) => !product.inStock) ? [{ value: 'OUT_OF_STOCK', label: 'Out of stock' }] : []),
  ], [products]);

  const availableFeatureFilters = useMemo(() => [
    ...(products.some((product) => Boolean(product.discount && product.discount > 0)) ? [{ value: 'DISCOUNTED', label: 'Discounted' }] : []),
    ...(products.some((product) => product.isNew) ? [{ value: 'NEW', label: 'New arrivals' }] : []),
    ...(products.some((product) => product.isTrending) ? [{ value: 'TRENDING', label: 'Trending' }] : []),
    ...(products.some((product) => !product.variants?.length) ? [{ value: 'NO_VARIANTS', label: 'Without variants' }] : []),
  ], [products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const list = products.filter((product) => {
      const matchesSearch = !normalizedSearch || [
        product.title,
        product.slug,
        product.collection?.name,
        product.shortDescription,
      ].some((value) => value?.toLowerCase().includes(normalizedSearch));
      const matchesCollection = collectionFilter === 'ALL'
        || (collectionFilter === 'NONE' ? !product.collectionId : product.collectionId === collectionFilter);
      const matchesGender = genderFilter === 'ALL' || product.collection?.targetGender === genderFilter;
      const matchesStock = stockFilter === 'ALL'
        || (stockFilter === 'IN_STOCK' ? product.inStock : !product.inStock);
      const matchesFeature = featureFilter === 'ALL'
        || (featureFilter === 'DISCOUNTED' && Boolean(product.discount && product.discount > 0))
        || (featureFilter === 'NEW' && product.isNew)
        || (featureFilter === 'TRENDING' && product.isTrending)
        || (featureFilter === 'NO_VARIANTS' && (!product.variants || product.variants.length === 0));
      return matchesSearch && matchesCollection && matchesGender && matchesStock && matchesFeature;
    });

    return [...list].sort((left, right) => {
      if (sort === 'NAME') return left.title.localeCompare(right.title);
      if (sort === 'PRICE_ASC') return left.price - right.price;
      if (sort === 'PRICE_DESC') return right.price - left.price;
      if (sort === 'STOCK_ASC') return productStock(left) - productStock(right);
      if (sort === 'STOCK_DESC') return productStock(right) - productStock(left);
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }, [collectionFilter, featureFilter, genderFilter, products, search, sort, stockFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * PRODUCTS_PAGE_SIZE,
    currentPage * PRODUCTS_PAGE_SIZE,
  );

  const hasActiveProductFilters = Boolean(
    search || collectionFilter !== 'ALL' || genderFilter !== 'ALL'
    || stockFilter !== 'ALL' || featureFilter !== 'ALL' || sort !== 'NEWEST',
  );

  const clearProductFilters = () => {
    setSearch('');
    setCollectionFilter('ALL');
    setGenderFilter('ALL');
    setStockFilter('ALL');
    setFeatureFilter('ALL');
    setSort('NEWEST');
    setPage(1);
  };

  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/products', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load products.');
      }
      const list: ProductDTO[] = payload.data ?? [];
      setProducts(list);
      onProductsCountChange?.(payload.count ?? list.length ?? 0);
    } catch (error) {
      console.error('Failed to fetch products', error);
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to load products.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [onProductsCountChange]);

  const fetchCollections = useCallback(async () => {
    try {
      const response = await fetch('/api/collections');
      const payload = await response.json();
      if (response.ok) {
        setCollections(payload.collections || []);
      }
    } catch (error) {
      console.error('Failed to fetch collections', error);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCollections();
  }, [fetchCollections, fetchProducts]);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedProduct(null);
    setFormValues(defaultFormState);
    setMatrixColors([]);
    setImageAssignments([]);
    setMatrixSizes('');
    setMatrixStock({});
    setMatrixVariantImages({});
    setBulkStock('');
    setIsModalOpen(true);
    setStatus({ type: 'idle', message: '' });
  };

  const openEditModal = (product: ProductDTO) => {
    setModalMode('edit');
    setSelectedProduct(product);
    
    // Explicitly parse and normalize gender and category without cross-contamination
    const rawGender = (product as any).gender ? String((product as any).gender).toLowerCase().trim() : 'men';
    const rawCategory = product.category ? String(product.category).toLowerCase().trim() : (rawGender === 'kids' ? 'kids' : 'sneakers');

    setFormValues({
      slug: product.slug, 
      category: rawCategory, 
      gender: rawGender, 
      colors: product.colors || [],
      title: product.title,
      collectionId: product.collectionId ?? '',
      price: String(product.price),
      salePrice: product.salePrice ? String(product.salePrice) : '',
      shortDescription: product.shortDescription,
      description: product.description,
      image: product.image ?? '',
      images: csvFromArray(product.images),
      videoUrl: product.videoUrl ?? '',
      advantages: csvFromArray(product.advantages),
      features: csvFromArray(product.features),
      specifications: specsToString(product.specifications),
      variants: product.variants || [],
      inStock: product.inStock,
      discount: String(product.discount || 0),
      sendPromoEmail: false,
    });

    const uniqueColors = Array.from(new Set((product.variants || []).map(v => v.color)));
    const variantsByColor = (color: string) => (product.variants || []).find(v => v.color === color);
    const assignments: ImageAssignment[] = [];
    uniqueColors.forEach(colorName => {
      const variant = variantsByColor(colorName);
      if (variant?.imageUrl) assignments.push({ url: variant.imageUrl, color: colorName });
      (variant?.images || []).forEach(url => {
        if (url && !assignments.some(a => a.url === url)) assignments.push({ url, color: colorName });
      });
    });
    const colorsWithImages = buildColorsFromAssignments(assignments);
    const videoOnlyColors = uniqueColors
      .filter((color) => !colorsWithImages.some(c => c.name.toLowerCase() === color.toLowerCase()))
      .map((color) => {
        const variant = variantsByColor(color);
        return { name: color, videoUrl: variant?.videoUrl || undefined };
      })
      .filter((color) => color.videoUrl);
    const uniqueSizes = Array.from(new Set((product.variants || []).map(v => v.size)));
    const stockMap: Record<string, number> = {};
    const variantImageMap: Record<string, string> = {};
    (product.variants || []).forEach(v => {
      stockMap[`${v.color}-${v.size}`] = v.stock;
      const colorDefault = colorsWithImages.find((color) => color.name === v.color)?.imageUrl;
      if (v.imageUrl && v.imageUrl !== colorDefault) {
        variantImageMap[`${v.color}-${v.size}`] = v.imageUrl;
      }
    });

    setImageAssignments(assignments);
    setMatrixColors([...colorsWithImages, ...videoOnlyColors]);
    setMatrixSizes(uniqueSizes.join(', '));
    setMatrixStock(stockMap);
    setMatrixVariantImages(variantImageMap);
    setBulkStock('');

    setIsModalOpen(true);
    setStatus({ type: 'idle', message: '' });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormValues(defaultFormState);
    setSelectedProduct(null);
    setMatrixColors([]);
    setImageAssignments([]);
    setMatrixSizes('');
    setMatrixStock({});
    setMatrixVariantImages({});
    setBulkStock('');
    setStatus({ type: 'idle', message: '' });
  };

  const handleInputChange = (key: keyof ProductFormState, value: string | boolean) => {
    setFormValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const addMatrixColor = () => setMatrixColors([...matrixColors, { name: '' }]);
  const updateMatrixColor = (index: number, key: keyof MatrixColor, value: string) => {
    const next = [...matrixColors];
    next[index] = { ...next[index], [key]: value };
    setMatrixColors(next);
  };
  const removeMatrixColor = (index: number) => {
    const next = [...matrixColors];
    next.splice(index, 1);
    setMatrixColors(next);
  };

  const syncGallery = (csv: string) => {
    handleInputChange('images', csv);
  };

  const applyBulkStock = () => {
    const stock = Number(bulkStock);
    if (!Number.isInteger(stock) || stock < 0) {
      setStatus({ type: 'error', message: 'Bulk stock must be a non-negative whole number.' });
      return;
    }

    const nextStock = { ...matrixStock };
    matrixColors.forEach((color) => matrixSizeList.forEach((size) => {
      nextStock[`${color.name}-${size}`] = stock;
    }));
    setMatrixStock(nextStock);
    setStatus({ type: 'idle', message: '' });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: 'idle', message: '' });

    try {
      const compiledVariants: ProductVariant[] = [];
      const sizesArray = matrixSizeList;
      matrixColors.forEach(color => {
        sizesArray.forEach(size => {
          const existingId = selectedProduct?.variants?.find(v => v.color === color.name && v.size === size)?.id;
          compiledVariants.push({
            id: existingId || (Date.now().toString() + Math.random().toString(36).substring(2, 9)),
            color: color.name,
            size,
            stock: matrixStock[`${color.name}-${size}`] || 0,
            imageUrl: matrixVariantImages[`${color.name}-${size}`] || color.imageUrl,
            images: csvToArray(color.images || ''),
            videoUrl: color.videoUrl || undefined
          });
        });
      });

      const resolvedColors = matrixColors.map(c => c.name.trim()).filter(Boolean);

      const payload = {
        slug: formValues.slug,
        gender: (formValues.gender || 'men').toLowerCase().trim(),
        category: (formValues.category || (formValues.gender === 'kids' ? 'kids' : 'sneakers')).toLowerCase().trim(),
        colors: resolvedColors,
        title: formValues.title,
        collectionId: formValues.collectionId || null,
        description: formValues.description,
        shortDescription: formValues.shortDescription,
        price: Number(formValues.price),
        salePrice: formValues.salePrice ? Number(formValues.salePrice) : null,
        image: formValues.image || null,
        images: csvToArray(formValues.images),
        videoUrl: formValues.videoUrl || null,
        advantages: csvToArray(formValues.advantages),
        features: csvToArray(formValues.features),
        specifications: specsToObject(formValues.specifications),
        variants: compiledVariants,
        inStock: formValues.inStock,
        discount: formValues.discount ? Number(formValues.discount) : 0,
        sendPromoEmail: formValues.sendPromoEmail,
      };

      const endpoint =
        modalMode === 'edit' && selectedProduct
          ? `/api/products/${selectedProduct.slug}`
          : '/api/products';

      const method = modalMode === 'edit' ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save product.');
      }

      setStatus({ type: 'success', message: 'Product saved successfully.' });
      closeModal();
      fetchProducts();
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to save product.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    setIsDeletingId(slug);
    setStatus({ type: 'idle', message: '' });

    try {
      const response = await fetch(`/api/products/${slug}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete product.');
      }

      setStatus({ type: 'success', message: 'Product deleted successfully.' });
      fetchProducts();
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to delete product.',
      });
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Products Management</h2>
          <p className="text-sm text-gray-500">
            Add new products or update existing details. Changes appear instantly on the storefront.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-5 py-2 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition"
        >
          + Add Product
        </button>
      </div>

      {status.type !== 'idle' && (
        <AdminNotice type={status.type} message={status.message} />
      )}

      {isLoading ? (
        <AdminLoadingState label="Loading products..." />
      ) : products.length === 0 ? (
        <AdminEmptyState
          title="No products found"
          description="Add your first product to start building the store catalog."
          action={{ label: 'Add product', onClick: openCreateModal }}
        />
      ) : (
        <div className="space-y-5">
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm" aria-label="Product filters">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <AdminFilterSearch label="Search products" className="xl:col-span-2" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Name, slug or collection" />
              <AdminFilterSelect label="Collection" aria-label="Collection filter" value={collectionFilter} onChange={(event) => { setCollectionFilter(event.target.value); setPage(1); }}>
                <option value="ALL">All collections</option>
                {products.some((product) => !product.collectionId) && <option value="NONE">No collection</option>}
                {availableCollections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
              </AdminFilterSelect>
              <AdminFilterSelect label="Customer category" aria-label="Customer category filter" value={genderFilter} onChange={(event) => { setGenderFilter(event.target.value); setPage(1); }}>
                <option value="ALL">All customer categories</option>
                {availableGenders.map((gender) => <option key={gender} value={gender}>{genderLabels[gender] || gender}</option>)}
              </AdminFilterSelect>
              <AdminFilterSelect label="Availability" aria-label="Stock filter" value={stockFilter} onChange={(event) => { setStockFilter(event.target.value); setPage(1); }}>
                <option value="ALL">All availability</option>
                {availableStockFilters.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </AdminFilterSelect>
              <AdminFilterSelect label="Product type" aria-label="Product type filter" value={featureFilter} onChange={(event) => { setFeatureFilter(event.target.value); setPage(1); }}>
                <option value="ALL">All product types</option>
                {availableFeatureFilters.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </AdminFilterSelect>
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500"><span className="font-semibold text-gray-900">{filteredProducts.length}</span> of {products.length} products shown</p>
              <div className="flex items-center gap-3">
                <AdminFilterSelect label="Sort by" aria-label="Sort products" value={sort} onChange={(event) => { setSort(event.target.value as ProductSort); setPage(1); }} className="w-full sm:w-52">
                  <option value="NEWEST">Newest first</option>
                  <option value="NAME">Name A-Z</option>
                  <option value="PRICE_ASC">Price low-high</option>
                  <option value="PRICE_DESC">Price high-low</option>
                  <option value="STOCK_ASC">Stock low-high</option>
                  <option value="STOCK_DESC">Stock high-low</option>
                </AdminFilterSelect>
                {hasActiveProductFilters && <button type="button" onClick={clearProductFilters} className="rounded-xl px-3 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-50">Clear filters</button>}
              </div>
            </div>
          </section>

          {filteredProducts.length === 0 ? (
            <AdminEmptyState title="No products match these filters" description="Change or clear the filters to see more products." action={{ label: 'Clear filters', onClick: clearProductFilters }} compact />
          ) : (
          <>
          <div className="grid gap-6 md:grid-cols-2">
          {paginatedProducts.map((product) => (
            <div key={product.id} className="border border-gray-200 rounded-2xl p-4 shadow-sm flex gap-4 bg-white hover:shadow-md transition-shadow">
              <div className="w-28 h-28 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0 relative">
                <Image src={product.image || '/logo_main.png'} alt={product.title} fill className="object-cover"  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-xs uppercase tracking-widest font-bold text-purple-500">
                      {product.collection?.name || 'No Collection'}
                    </p>
                    {product.collection?.targetGender && (
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter ${
                        product.collection.targetGender === 'MEN' ? 'bg-blue-50 text-blue-600' :
                        product.collection.targetGender === 'WOMEN' ? 'bg-pink-50 text-pink-600' :
                        'bg-gray-50 text-gray-600'
                      }`}>
                        {product.collection.targetGender}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] uppercase tracking-tighter font-bold px-2 py-0.5 rounded-full ${
                      product.inStock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {product.inStock ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{product.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{product.shortDescription}</p>
                <div className="flex items-center justify-between pt-2">
                  <div className="flex flex-col">
                    <p className="text-xl font-bold text-purple-600">
                      {formatPKR(product.discount && product.discount > 0 
                        ? Math.round(product.price * (1 - product.discount / 100)) 
                        : product.price)}
                    </p>
                    {product.discount ? (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-black text-red-500 uppercase tracking-tight bg-red-50 px-1.5 py-0.5 rounded">
                          {product.discount}% OFF
                        </span>
                        <span className="text-[11px] font-bold text-gray-400 line-through">
                          {formatPKR(product.price)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      onClick={() => openEditModal(product)}
                      title="Edit Product"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-60"
                      onClick={() => handleDelete(product.slug)}
                      disabled={isDeletingId === product.slug}
                      title="Remove Product"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
            <AdminPagination page={currentPage} pageSize={PRODUCTS_PAGE_SIZE} totalItems={filteredProducts.length} itemLabel="products" onPageChange={setPage} />
          </div>
          </>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[calc(100vh-2rem)] flex flex-col border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Sticky Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80 backdrop-blur-sm">
              <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {modalMode === 'create' ? 'Add New Product' : 'Edit Product Details'}
              </h3>
              <button
                onClick={closeModal}
                className="w-10 h-10 rounded-full bg-gray-200/60 text-gray-600 hover:bg-gray-200 hover:text-gray-900 flex items-center justify-center transition-colors text-xs"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {status.type !== 'idle' && (
                  <div className="mb-4">
                    <AdminNotice type={status.type} message={status.message} />
                  </div>
                )}
                <form id="productForm" onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black text-purple-600 uppercase tracking-widest mb-1.5">Product Slug *</label>
                    <input
                      type="text"
                      required={modalMode === 'create'}
                      value={formValues.slug}
                      onChange={(e) => handleInputChange('slug', e.target.value)}
                      placeholder="e.g. bridal-heels-01"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-400 focus:bg-white outline-none transition-all lowercase placeholder:text-slate-500 hover:border-slate-400"
                      disabled={modalMode === 'edit'}
                    />
                    <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-widest">Permanent unique identifier</p>
                  </div>
                  <div>
                      <label className="block text-xs font-black text-purple-600 uppercase tracking-widest mb-1.5">Collection</label>
                      <select
                        value={formValues.collectionId}
                        onChange={(e) => handleInputChange('collectionId', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-400 focus:bg-white outline-none transition-all appearance-none bg-no-repeat bg-right pr-10 hover:border-slate-400"
                        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23475569\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundSize: '1.5em' }}
                      >
                        <option value="">No Collection</option>
                        {collections.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-black text-purple-600 uppercase tracking-widest mb-1.5">Target Section (Gender) *</label>
                      <select
                        value={formValues.gender || 'men'}
                        onChange={(e) => handleInputChange('gender', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-400 focus:bg-white outline-none transition-all appearance-none bg-no-repeat bg-right pr-10 hover:border-slate-400"
                        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23475569\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundSize: '1.5em' }}
                      >
                        <option value="men">Men</option>
                        <option value="women">Women</option>
                        <option value="kids">Kids</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-purple-600 uppercase tracking-widest mb-1.5">Category *</label>
                      <select
                        value={formValues.category || 'sneakers'}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-400 focus:bg-white outline-none transition-all appearance-none bg-no-repeat bg-right pr-10 hover:border-slate-400"
                        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23475569\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundSize: '1.5em' }}
                      >
                        {formValues.gender === 'women' ? (
                          <>
                            <option value="casual">Casual</option>
                            <option value="bridal">Bridal</option>
                            <option value="formal">Formal</option>
                          </>
                        ) : formValues.gender === 'kids' ? (
                          <option value="kids">Kids</option>
                        ) : (
                          <>
                            <option value="sneakers">Sneakers</option>
                            <option value="formal">Formal</option>
                            <option value="casual">Casual</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-black text-purple-600 uppercase tracking-widest mb-1.5">Display Name *</label>
                      <input
                        type="text"
                        required
                        value={formValues.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-400 focus:bg-white outline-none transition-all placeholder:text-slate-500 hover:border-slate-400"
                        placeholder="e.g. Luxury Velvet Bridal Heels"
                      />
                    </div>
                  </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black text-purple-600 uppercase tracking-widest mb-1.5">Sale Price (PKR) *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">Rs.</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={formValues.price}
                        onChange={(e) => handleInputChange('price', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-12 pr-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-400 focus:bg-white outline-none transition-all placeholder:text-slate-500 hover:border-slate-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-purple-600 uppercase tracking-widest mb-1.5">Original Price (optional)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">Rs.</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={formValues.salePrice}
                        onChange={(e) => handleInputChange('salePrice', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-12 pr-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-400 focus:bg-white outline-none transition-all placeholder:text-slate-500 hover:border-slate-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-purple-600 uppercase tracking-widest mb-1.5">Discount Percentage (%)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">%</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={formValues.discount}
                        onChange={(e) => handleInputChange('discount', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-400 focus:bg-white outline-none transition-all placeholder:text-slate-500 hover:border-slate-400"
                        placeholder="e.g. 20"
                      />
                    </div>
                  </div>
                  {Number(formValues.discount) > 0 && Number(formValues.price) > 0 && (
                    <div className="md:col-span-2 bg-green-50 border border-green-100 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Updated Amount (Final Price)</p>
                        <p className="text-2xl font-black text-gray-900">
                          {formatPKR(Math.round(Number(formValues.price) * (1 - Number(formValues.discount) / 100)))}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">You Save</p>
                        <p className="text-lg font-bold text-green-600">
                          {formatPKR(Math.round(Number(formValues.price) * (Number(formValues.discount) / 100)))}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="flex flex-col sm:flex-row gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          checked={formValues.inStock}
                          onChange={(e) => handleInputChange('inStock', e.target.checked)}
                          className="w-5 h-5 border-2 border-slate-300 rounded text-purple-600 focus:ring-purple-500 transition-colors"
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-700 group-hover:text-purple-600 transition-colors">In Stock</span>
                    </label>

                    {modalMode === 'create' && (
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            checked={formValues.sendPromoEmail}
                            onChange={(e) => handleInputChange('sendPromoEmail', e.target.checked)}
                            className="w-5 h-5 border-2 border-slate-300 rounded text-pink-600 focus:ring-pink-500 transition-colors"
                          />
                        </div>
                        <span className="text-sm font-bold text-gray-700 group-hover:text-pink-600 transition-colors">Send Promo Email</span>
                      </label>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-purple-600 uppercase tracking-widest mb-1.5">Tagline / Short Description *</label>
                  <textarea
                    required
                    value={formValues.shortDescription}
                    onChange={(e) => handleInputChange('shortDescription', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-400 focus:bg-white outline-none transition-all placeholder:text-slate-500 hover:border-slate-400 resize-none"
                    rows={2}
                    placeholder="Summarize the footwear in one or two sentences (e.g. Elegant ivory heels with pearl embellishments)..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-purple-600 uppercase tracking-widest mb-1.5">Complete Product Story *</label>
                  <textarea
                    required
                    value={formValues.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-400 focus:bg-white outline-none transition-all placeholder:text-slate-500 hover:border-slate-400 resize-none"
                    rows={5}
                    placeholder="Detail material, heel height, occasion suitability, and comfort features..."
                  />
                </div>

                <div className="space-y-6 bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-2xl border border-blue-200">
                  <h4 className="text-sm uppercase font-black text-blue-600 tracking-widest flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    Variant Builder
                  </h4>
                  <p className="-mt-3 text-xs leading-5 text-blue-700/80">
                    Upload your product images first, then use the eyedropper on each image to sample its exact color — the dot and color name are set automatically. Add sizes once, and every color × size combination gets its own stock.
                  </p>
                  
                    {/* Step 1: Product Images */}
                    <div className="bg-white p-4 rounded-xl border border-blue-100 space-y-4 shadow-sm">
                      <label className="block text-xs font-black text-blue-600 uppercase mb-1">Step 1: Product Cover & Gallery</label>
                      <div className="grid gap-4 md:grid-cols-2">
                        <FileUpload
                          label="Cover Image"
                          accept="image"
                          value={formValues.image}
                          onChange={(url) => handleInputChange('image', url)}
                          placeholder="Primary cover image"
                        />
                        <MultiFileUpload
                          label="Gallery Images (3-4 images)"
                          value={formValues.images}
                          onChange={syncGallery}
                          placeholder="Upload distinct gallery images"
                          showPreviewGrid={true}
                        />
                      </div>
                    </div>

                    {/* Variant Colors Section */}
                    <div className="bg-white p-4 rounded-xl border border-blue-100 space-y-4 shadow-sm">
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-black text-blue-600 uppercase">Step 1B: Variant Colors & Specific Images</label>
                        <button type="button" onClick={addMatrixColor} className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          + ADD COLOR
                        </button>
                      </div>
                      
                      {matrixColors.length === 0 && (
                        <p className="text-xs text-gray-500">No color variants added.</p>
                      )}
                      
                      <div className="space-y-3">
                        {matrixColors.map((color, idx) => (
                          <div key={idx} className="flex flex-col md:flex-row items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <div className="w-full md:w-1/3">
                              <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">Color Name</label>
                              <div className="flex gap-2">
                                <span className="w-8 h-8 rounded-full border border-gray-300 flex-shrink-0" style={{ backgroundColor: resolveColorCode(color.name) }} />
                                <input
                                  type="text"
                                  value={color.name}
                                  onChange={(e) => updateMatrixColor(idx, 'name', e.target.value)}
                                  placeholder="e.g. Black or #a52a2a"
                                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:ring-blue-500 outline-none"
                                />
                              </div>
                            </div>
                            <div className="w-full md:w-1/2">
                              <FileUpload
                                label="Variant Image (Optional)"
                                accept="image"
                                value={color.imageUrl || ''}
                                onChange={(url) => updateMatrixColor(idx, 'imageUrl', url)}
                                placeholder="Image specifically for this color"
                              />
                            </div>
                            <div className="w-full md:w-auto self-end">
                              <button type="button" onClick={() => removeMatrixColor(idx)} className="text-red-500 hover:text-red-700 text-xs font-bold py-2 outline-none">
                                REMOVE
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Step 2: Sizes */}
                  <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                    <label className="block text-xs font-black text-blue-600 uppercase mb-2">Step 2: Add Sizes in Bulk</label>
                    <input
                      type="text"
                      value={matrixSizes}
                      onChange={(e) => setMatrixSizes(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all hover:border-slate-400"
                      placeholder="e.g. S, M, L, XL or 7, 8, 9, 10"
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      {SIZE_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setMatrixSizes(preset.value)}
                          className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-700 transition hover:border-blue-400 hover:bg-blue-100"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 3: Stock Matrix */}
                  {matrixColors.length > 0 && matrixSizeList.length > 0 && (
                    <div className="bg-white p-4 rounded-xl border border-blue-100 overflow-x-auto shadow-sm">
                      <label className="block text-xs font-black text-blue-600 uppercase mb-4">Step 3: Enter Stock Quantities</label>
                      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl bg-blue-50 p-3">
                        <label className="flex-1 space-y-1 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                          Set the same stock for every variant
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={bulkStock}
                            onChange={(event) => setBulkStock(event.target.value)}
                            placeholder="e.g. 10"
                            className="block w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </label>
                        <button type="button" onClick={applyBulkStock} className="rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700">
                          Apply to all
                        </button>
                      </div>
                      <table className="w-full text-left border-collapse min-w-[300px]">
                        <thead>
                          <tr>
                            <th className="p-3 border-b-2 border-gray-100 text-xs text-gray-500 font-bold uppercase w-1/4">Color \ Size</th>
                            {matrixSizeList.map((size, idx) => (
                              <th key={idx} className="p-3 border-b-2 border-gray-100 text-xs text-gray-800 font-black text-center">{size}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {matrixColors.map((color, cIdx) => (
                            <tr key={cIdx} className="hover:bg-slate-50">
                              <td className="p-3 border-b border-gray-50 text-sm font-bold text-gray-700">{color.name}</td>
                              {matrixSizeList.map((size, sIdx) => {
                                const key = `${color.name}-${size}`;
                                return (
                                  <td key={sIdx} className="p-2 border-b border-gray-50 text-center">
                                    <input
                                      type="number"
                                      min="0"
                                      value={matrixStock[key] === undefined ? '' : matrixStock[key]}
                                      onChange={(e) => setMatrixStock({ ...matrixStock, [key]: parseInt(e.target.value) || 0 })}
                                      className="w-20 text-center bg-white border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none mx-auto shadow-inner"
                                      placeholder="0"
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <details className="mt-5 rounded-xl border border-blue-100 bg-slate-50 p-4">
                        <summary className="cursor-pointer text-xs font-black uppercase tracking-wider text-blue-700">
                          Per-variant image overrides (optional)
                        </summary>
                        <p className="mt-2 text-xs leading-5 text-gray-500">
                          Each variant uses its color image by default. Upload an override only when a specific size needs a different image.
                        </p>
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          {matrixColors.flatMap((color, cIdx) => matrixSizeList.map((size, sIdx) => {
                            const key = `${color.name}-${size}`;
                            const reactKey = `${key}-${cIdx}-${sIdx}`;
                            return (
                              <div key={reactKey} className="rounded-xl border border-gray-200 bg-white p-3">
                                <p className="mb-3 text-xs font-bold text-gray-800">{color.name} / {size}</p>
                                <FileUpload
                                  label=""
                                  accept="image"
                                  value={matrixVariantImages[key] || ''}
                                  onChange={(url) => setMatrixVariantImages((current) => ({ ...current, [key]: url }))}
                                  placeholder="Optional variant-specific image"
                                />
                              </div>
                            );
                          }))}
                        </div>
                      </details>
                    </div>
                  )}
                </div>

                <div className="space-y-4 bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-2xl border border-purple-200">
                  <h4 className="text-xs uppercase font-black text-purple-400 tracking-widest">Additional Metadata</h4>
                  <div className="grid gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-purple-600 uppercase mb-1">Selling Points (Comma separated)</label>
                      <textarea
                        value={formValues.features}
                        onChange={(e) => handleInputChange('features', e.target.value)}
                        className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none transition-all placeholder:text-purple-300 hover:border-purple-300 resize-none"
                        rows={2}
                        placeholder="Feature 1, Feature 2, Feature 3"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-purple-600 uppercase mb-1">Key Advantages (Comma separated)</label>
                    <textarea
                      value={formValues.advantages}
                      onChange={(e) => handleInputChange('advantages', e.target.value)}
                      className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none transition-all placeholder:text-purple-300 hover:border-purple-300 resize-none"
                      rows={2}
                      placeholder="Advantage 1, Advantage 2, Advantage 3"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-purple-600 uppercase mb-1">Detailed Specifications (Key: Value per line)</label>
                    <textarea
                      value={formValues.specifications}
                      onChange={(e) => handleInputChange('specifications', e.target.value)}
                      className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none transition-all placeholder:text-purple-300 hover:border-purple-300 resize-none"
                      rows={3}
                      placeholder="Material: Leather&#10;Heel: 3 inch&#10;Sole: Rubber"
                    />
                  </div>
                </div>
              </form>
            </div>

            {/* Sticky Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/80 backdrop-blur-sm">
              <button
                type="button"
                onClick={closeModal}
                className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 active:bg-gray-200 rounded-xl transition-all"
              >
                Discard
              </button>
              <button
                type="submit"
                form="productForm"
                disabled={isSubmitting}
                className="px-8 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {isSubmitting ? 'Syncing...' : modalMode === 'create' ? 'Deploy Product' : 'Update Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}