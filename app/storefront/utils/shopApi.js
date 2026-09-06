// app/storefront/utils/shopApi.js

export async function fetchProducts(genderOrCategory = null) {
  try {
    // Build query params dynamically to support filtering server-side
    let url = '/api/products';
    if (genderOrCategory && genderOrCategory !== 'ALL') {
      const queryVal = encodeURIComponent(genderOrCategory.toLowerCase().trim());
      // Support passing either a gender ('men'/'women') or a category
      if (['men', 'women', 'kids', 'unisex'].includes(genderOrCategory.toLowerCase().trim())) {
        url += `?gender=${queryVal}`;
      } else {
        url += `?category=${queryVal}`;
      }
    }

    const response = await fetch(url, { cache: 'no-store' });
    const contentType = response.headers.get("content-type");
    
    if (!contentType || !contentType.includes("application/json")) {
      const errorHtml = await response.text();
      console.error(`API Error at ${url}: Server returned HTML (${response.status}). Preview:`, errorHtml.substring(0, 200));
      return [];
    }
    
    const json = await response.json();

    if (!response.ok || !json.success) {
      console.error('Failed to load products from API:', json.error || response.statusText);
      return [];
    }

    return (json.data || []).map((product) => {
      // Calculate total stock from variants to guarantee correct out-of-stock evaluation
      const variants = Array.isArray(product.variants) ? product.variants : [];
      const totalStock = variants.reduce((sum, v) => sum + Math.max(0, Number(v.stock) || 0), 0);
      const computedInStock = product.inStock === false || (variants.length > 0 && totalStock === 0) ? false : true;

      return {
        id: product.id,
        title: product.title,
        slug: product.slug,
        price: product.price,
        formattedPrice: `Rs.${product.price?.toLocaleString() || 0}`,
        originalPrice: product.salePrice ? product.salePrice : null,
        formattedOriginalPrice: product.salePrice ? `Rs.${product.salePrice.toLocaleString()}` : null,
        discount: product.discount ? `${product.discount}% OFF` : null,
        image: product.image || (product.images?.[0]) || '/assets/placeholder.jpg',
        images: product.images && product.images.length > 0 ? product.images : [product.image].filter(Boolean),
        description: product.description,
        shortDescription: product.shortDescription,
        // Properly map gender and category lowercase for robust frontend filtering
        gender: (product.gender || 'men').toLowerCase(),
        category: (product.category || 'casual').toLowerCase(),
        collection: product.collection?.name || '',
        sizes: product.sizes && product.sizes.length > 0 ? product.sizes : ['36', '37', '38', '39', '40'],
        colors: product.colors && product.colors.length > 0 ? product.colors : ['#1F2937'],
        variants: variants,
        colorVariants: variants,
        inStock: computedInStock,
        details: product.specifications || {},
      };
    });
  } catch (error) {
    console.error('Error fetching catalog:', error);
    return [];
  }
}