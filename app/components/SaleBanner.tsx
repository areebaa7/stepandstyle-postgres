'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSaleStatus } from '../hooks/useSaleStatus';
import type { BannerDTO } from '@/types/banner';
import ScrollAnimate from './ScrollAnimate';

export default function SaleBanner({ banner }: { fullWidth?: boolean; banner?: BannerDTO }) {
  const saleInfo = useSaleStatus();

  // If there's no active global sale event AND no active dynamic banner, don't show anything.
  if ((!saleInfo || !saleInfo.show) && !banner) return null;

  const eventName = saleInfo?.eventName || 'EXCLUSIVE SALE EVENT';
  const mainHeading = banner?.title || saleInfo?.bannerText?.split(':')[0] || 'ENJOY SPECIAL';
  const subHeading = banner?.subtitle || saleInfo?.bannerText?.substring(saleInfo.bannerText.indexOf(':') + 1).trim() || 'DISCOUNT THIS MONTH';
  const description = "Step into style and unmatched comfort. For a limited time, experience our premium handcrafted collections at exclusive promotional prices. Elevate your footwear wardrobe today.";

  const desktopImage = banner
    ? (banner.desktopImageSlot ?? 1) === 2 ? banner.mobileImageUrl : banner.desktopImageUrl
    : "/Banner/sale_banner_clean.png";
  const mobileImage = banner
    ? (banner.mobileImageSlot ?? 2) === 1 ? banner.desktopImageUrl : banner.mobileImageUrl
    : desktopImage;
  const ctaText = banner?.ctaText || "Shop The Sale Now";
  const ctaLink = banner?.ctaLink || "/products?onSale=true";

  return (
    <section className="bg-[#FAF9FF] border-y border-[#F5F3FF]">
      {/* Desktop View */}
      <div className="hidden md:grid w-full grid-cols-2 items-stretch min-h-[500px]">
        <div className={`relative w-full h-full min-h-[400px] ${banner?.textPosition === 'OUTSIDE_LEFT' ? 'order-2' : 'order-1'}`}>
          <Image
            src={desktopImage}
            alt={eventName}
            fill
            className="object-cover transition-all duration-1000"
           sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
        </div>
        <div className={`flex flex-col justify-center p-12 lg:p-24 space-y-6 bg-white ${banner?.textPosition === 'OUTSIDE_LEFT' ? 'order-1' : 'order-2'}`}>
          <ScrollAnimate animation="slide-in-right">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold  tracking-tight leading-tight text-[#0B1727]">
              {mainHeading}
            </h2>
            <p className="text-gray-500 text-lg md:text-xl font-light leading-relaxed max-w-lg mt-6">
              {subHeading && subHeading !== 'DISCOUNT THIS MONTH' ? subHeading : description}
            </p>
            <Link
              href={ctaLink}
              className="inline-block bg-[#F3E8FF] text-[#6B21A8] px-10 py-5 text-sm font-semibold  tracking-wide hover:bg-[#6B21A8] hover:text-white transition-all duration-300 shadow-sm mt-10"
            >
              {ctaText}
            </Link>
          </ScrollAnimate>
        </div>
      </div>

      {/* Mobile View */}
      <div className="block md:hidden relative h-[380px] w-full overflow-hidden">
        <Image
          src={mobileImage}
          alt={eventName}
          fill
          className="object-cover"
         sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-purple-950/15" />
        <div className="absolute inset-0 flex flex-col justify-end p-8 text-center space-y-3">
          <ScrollAnimate animation="fade-in">
            <h3 className="text-3xl font-semibold  tracking-tight text-white leading-tight">
              {mainHeading}
            </h3>
            <p className="text-white/80 text-xs mt-2 font-medium">
              {subHeading && subHeading !== 'DISCOUNT THIS MONTH' ? subHeading : description}
            </p>
            <div className="pt-4">
              <Link
                href={ctaLink}
                className="inline-block bg-white text-black hover:bg-[#E9D5FF] hover:text-[#6B21A8] px-8 py-3.5 text-xs font-semibold  tracking-wide transition-all duration-300 shadow-xl"
              >
                {ctaText}
              </Link>
            </div>
          </ScrollAnimate>
        </div>
      </div>
    </section>
  );
}
