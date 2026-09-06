import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import Navbar from '@/app/components/Navbar';
import ProductCard from '@/app/products/components/ProductCard';
import { serializeProduct } from '@/lib/products';

export default async function GenderCategoryPage(props: { params: Promise<{ gender: string, category: string }> }) {
  const { gender, category } = await props.params;

  if (gender !== 'men' && gender !== 'women') {
    return notFound();
  }

  const validCategories = {
    men: ['sneakers', 'formal', 'casual'],
    women: ['casual', 'bridal', 'formal']
  };

  if (!validCategories[gender as 'men' | 'women'].includes(category)) {
    return notFound();
  }

  const products = await prisma.product.findMany({
    where: {
      gender: gender,
      category: category,
    },
    orderBy: { createdAt: 'desc' },
    include: { collection: true }
  });

  const formattedProducts = products.map((product) => {
    const baseSerialized = serializeProduct(product);
    let parsedSizes = (product as any).sizes;
    if (!parsedSizes || !Array.isArray(parsedSizes) || parsedSizes.length === 0) {
      if (Array.isArray(product.variants)) {
        parsedSizes = product.variants.map((v: any) => v.size).filter(Boolean);
      }
    }
    if (!parsedSizes || parsedSizes.length === 0) {
      parsedSizes = ['36', '37', '38', '39', '40', '41', '42'];
    }

    return {
      ...baseSerialized,
      sizes: parsedSizes,
      colors: Array.isArray(product.colors) && product.colors.length > 0 ? product.colors : [],
      images: Array.isArray(product.images) && product.images.length > 0 ? product.images : [product.image].filter(Boolean),
    };
  });

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col pt-24 pb-20">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-8">
        <h1 className="text-3xl font-black text-gray-900 mb-2 capitalize">{gender}'s {category}</h1>
        <p className="text-gray-500 mb-8 font-medium">Explore our collection of {gender}'s {category} footwear.</p>
        
        {formattedProducts.length === 0 ? (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-gray-400">No products found in this category.</h2>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {formattedProducts.map((product, index) => (
              <ProductCard key={product.id} product={product as any} index={index} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
