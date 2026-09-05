'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import ScrollAnimate from '../components/ScrollAnimate';

interface Blog {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  image?: string;
  author?: string;
  category?: string;
  tags?: string[];
  isPublished: boolean;
  createdAt: string;
}

export default function BlogsPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const response = await fetch('/api/blogs');
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Failed to fetch blogs');
        if (data.data) {
          // Filter only published blogs
          const publishedBlogs = data.data.filter((blog: Blog) => blog.isPublished);
          setBlogs(publishedBlogs);
          
          // Extract unique categories
          const uniqueCategories = Array.from(
            new Set(publishedBlogs.map((blog: Blog) => blog.category).filter(Boolean))
          ) as string[];
          setCategories(uniqueCategories);
        }
      } catch (error) {
        console.error('Failed to fetch blogs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlogs();
  }, []);

  const filteredBlogs = selectedCategory
    ? blogs.filter(blog => blog.category === selectedCategory)
    : blogs;

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      <Navbar />

      {/* Header Section */}
      <section className="pt-28 pb-14 px-6 bg-[#FAF9FF] border-b border-[#F5F3FF]">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollAnimate animation="fade-in">
            <h1 className="-mt-14 text-3xl md:text-5xl font-semibold mb-4 tracking-tight  text-gray-900">
              Our <span className="text-[#A855F7]">Blog</span>
            </h1>
            <p className="text-gray-400 text-sm md:text-base font-medium tracking-wide max-w-xl mx-auto leading-relaxed">
              Discover style tips, trend reports, and insider stories from the world of luxury footwear.
            </p>
          </ScrollAnimate>
        </div>
      </section>

      {/* Category Filter */}
      {categories.length > 0 && (
        <section className="py-12 px-6 bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-6 py-2.5 rounded-full font-bold  text-sm tracking-wider transition-all ${
                  selectedCategory === null
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Posts
              </button>
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-6 py-2.5 rounded-full font-bold  text-sm tracking-wider transition-all ${
                    selectedCategory === category
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Blogs Content */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-[#A855F7] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-400 font-semibold  tracking-wide text-xs">Loading Blogs...</p>
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="text-center py-20 bg-[#FAF9FF] rounded-3xl border border-[#F5F3FF]">
            <p className="text-gray-400 font-bold  tracking-wide">No blogs available yet. Stay tuned!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredBlogs.map((blog, index) => (
              <ScrollAnimate
                key={blog.id}
                animation="fade-in"
                delay={`${index * 0.05}s`}
                className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col group"
              >
                {/* Blog Image */}
                <div className="w-full h-48 bg-gray-100 rounded-t-3xl overflow-hidden relative">
                  {blog.image ? (
                    <Image
                      src={blog.image}
                      alt={blog.title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                     sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No image</div>
                  )}
                </div>

                {/* Blog Content */}
                <div className="p-6 flex flex-col flex-1">
                  {/* Category & Author */}
                  <div className="flex items-center justify-between mb-3 gap-2">
                    {blog.category && (
                      <span className="text-xs font-semibold  tracking-wide text-[#A855F7] bg-purple-50 px-3 py-1 rounded-full">
                        {blog.category}
                      </span>
                    )}
                    <span className="text-xs font-semibold  tracking-wide text-gray-400">
                      {new Date(blog.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-gray-900 mb-3  tracking-tight text-lg line-clamp-2">
                    {blog.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3">
                    {blog.description}
                  </p>

                  {/* Tags */}
                  {blog.tags && blog.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {blog.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="text-xs font-bold  tracking-wide text-gray-400 bg-gray-50 px-2 py-1 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Author */}
                  {blog.author && (
                    <p className="text-xs font-bold text-gray-500  tracking-wider mb-4">
                      By {blog.author}
                    </p>
                  )}

                  {/* Read More Link */}
                  <Link
                    href={`/blogs/${blog.slug}`}
                    className="mt-auto inline-flex items-center gap-2 text-purple-600 hover:text-pink-600 font-semibold  text-xs tracking-wide transition-colors group/link"
                  >
                    Read More
                    <svg className="w-3 h-3 group-hover/link:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </ScrollAnimate>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
