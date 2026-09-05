'use client';

import React from 'react';
import Navbar from '../components/Navbar';
import ScrollAnimate from '../components/ScrollAnimate';
import Image from 'next/image';

export default function OurStoryPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          <ScrollAnimate animation="fade-in" className="text-center mb-24">
            <h1 className="text-6xl md:text-6xl font-semibold  tracking-tight text-gray-900 mb-8">
              Our <span className="text-[#A855F7]">Story</span>
            </h1>
            <p className="text-gray-500 font-medium  tracking-wide text-sm max-w-2xl mx-auto leading-loose">Crafting elegance, one pair at a time. A journey from passion to prestige.</p>
          </ScrollAnimate>

          <div className="grid md:grid-cols-2 gap-20 items-center mb-32">
            <ScrollAnimate animation="fade-in" className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl">
              <Image
                src="https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&q=80&w=1000"
                alt="Craftsmanship"
                fill
                className="object-cover"
               sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
              <div className="absolute inset-0 bg-[#6B21A8]/10" />
            </ScrollAnimate>
            <ScrollAnimate animation="fade-in" delay="0.2s" className="space-y-8">
              <h2 className="text-4xl font-semibold  tracking-tight text-gray-900 leading-tight">The <br /> Beginning</h2>
              <p className="text-gray-600 font-medium leading-relaxed text-lg italic">
                "Step & Styl was born out of a simple realization: luxury footwear shouldn't just be about the label; it should be about the feeling of confidence and elegance it gives the wearer."
              </p>
              <p className="text-gray-600 font-medium leading-relaxed">
                Founded with a vision to redefine footwear in Pakistan, we combined traditional craftsmanship with modern design aesthetics. Our journey started in a small workshop where every stitch was a commitment to quality.
              </p>
            </ScrollAnimate>
          </div>

          <div className="bg-gray-900 rounded-[3rem] p-12 md:p-24 text-center text-white mb-32">
            <ScrollAnimate animation="fade-in">
              <h2 className="text-xs font-semibold  tracking-wide text-[#A855F7] mb-6">Our philosophy</h2>
              <h3 className="text-4xl md:text-6xl font-semibold  tracking-tight mb-10 leading-tight">Design <br /> Meet comfort</h3>
              <p className="max-w-2xl mx-auto text-gray-400 font-medium text-lg leading-relaxed">
                We believe that true style never compromises on comfort. Every pair of Step & Styl heels or slippers is engineered with advanced cushioning and ergonomic support, ensuring you look stunning and feel effortless all day long.
              </p>
            </ScrollAnimate>
          </div>

          <div className="text-center">
            <ScrollAnimate animation="fade-in">
              <h2 className="text-3xl font-semibold  tracking-tight text-gray-900 mb-8">Join our journey</h2>
              <p className="text-gray-500 font-medium  tracking-wide text-xs mb-10">Experience the perfect blend of fashion and function.</p>
              <button className="bg-[#6B21A8] text-white px-16 py-5 text-xs font-semibold  tracking-wide hover:bg-black transition-all shadow-2xl">
                Explore Collection
              </button>
            </ScrollAnimate>
          </div>
        </div>
      </main>
    </div>
  );
}
