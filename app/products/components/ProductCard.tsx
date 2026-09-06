'use client';

import Image from 'next/image';
import Link from 'next/link';
import { formatPKR } from '@/lib/currency';
import { resolveColorCode } from '@/lib/colors';
import type { ProductDTO } from '@/types/product';

interface ProductCardProps {
  product: ProductDTO;
  index: number;
}

export default function ProductCard({ product }: ProductCardProps) {
  // Check explicit stock flag OR calculate if all variant stocks total 0
  const totalStock = (product.variants || []).reduce((sum, v) => sum + Math.max(0, v.stock || 0), 0);
  const isOutOfStock = !product.inStock || ((product.variants?.length ?? 0) > 0 && totalStock === 0);

  const swatchColors = Array.isArray(product.colors) && product.colors.length > 0
    ? product.colors
    : ['#000000']; // Clean fallback if no colors defined

  const hasDiscount = Boolean(
    (product.discount && product.discount > 0) ||
    (product.salePrice && product.salePrice > product.price),
  );

  const discountPercent = product.discount && product.discount > 0 ? product.discount : null;

  const price = product.discount && product.discount > 0
    ? Math.round(product.price * (1 - product.discount / 100))
    : product.price;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block transition-transform duration-300"
    >
      <div className="relative aspect-[4/5] bg-[#F4F4F5] rounded-none overflow-hidden mb-3 border border-gray-100/60">
        <Image
          src={product.image || '/logo_main.png'}
          alt={product.title}
          fill
          sizes="(max-width: 640px) 80vw, (max-width: 768px) 320px, 260px"
          className={`object-contain p-4 transition-transform duration-500 group-hover:scale-105 ${
            isOutOfStock ? 'opacity-50 grayscale-[25%]' : ''
          }`}
        />

        {/* Badges / Sold Out Overlay */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1 z-10 items-start">
          {isOutOfStock && (
            <span className="bg-black text-white px-2 py-1 text-[9px] font-black uppercase tracking-wider shadow-sm">
              Sold Out
            </span>
          )}
          {!isOutOfStock && product.isNew && (
            <span className="bg-white text-black px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border border-gray-200">
              New
            </span>
          )}
        </div>

        {/* Optional center overlay badge for maximum visibility */}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="bg-black/80 backdrop-blur-xs text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 border border-white/20">
              Out of Stock
            </span>
          </div>
        )}
      </div>
      
      <div className="px-1 space-y-1">
        <h3 className="font-bold text-[12px] md:text-[13px] uppercase tracking-wider text-gray-900 group-hover:text-black transition-colors truncate">
          {product.title}
        </h3>
        
        <p className="text-[10px] uppercase font-semibold text-gray-400 tracking-widest">
          {product.collection?.targetGender || 'UNISEX'}
        </p>

        <div className="flex items-center gap-2 pt-0.5 flex-wrap">
          {hasDiscount && (
            <span className="text-gray-400 text-[11px] line-through font-semibold">
              {formatPKR(product.salePrice || product.price)}
            </span>
          )}
          <span className="font-extrabold text-[13px] md:text-[14px] text-gray-900 leading-none">
            {formatPKR(price)}
          </span>
          {discountPercent !== null && !isOutOfStock && (
            <span className="text-[11px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded-xs">
              -{discountPercent}%
            </span>
          )}
        </div>

        {swatchColors.length > 0 && (
          <div className="flex items-center gap-1.5 pt-1">
            {swatchColors.slice(0, 4).map((color, i) => (
              <div
                key={i}
                className="w-3.5 h-3.5 rounded-xs border border-gray-300 shadow-2xs"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
            {swatchColors.length > 4 && (
              <span className="text-[9px] text-gray-400 font-bold">+{swatchColors.length - 4}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}