'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import ScrollAnimate from '@/app/components/ScrollAnimate';

interface Blog {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  image?: string;
  images?: string[];
  videoUrl?: string;
  author?: string;
  category?: string;
  tags?: string[];
  isPublished: boolean;
  createdAt: string;
}

export default function BlogDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [blog, setBlog] = useState<Blog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/blogs/${encodeURIComponent(slug)}`);
        const data = await response.json();

        if (!response.ok || !data.data) throw new Error(data.error || 'Blog not found');
        setBlog(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch blog');
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
      fetchBlog();
    }
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white font-sans text-gray-900">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-40">
          <div className="w-12 h-12 border-4 border-[#A855F7] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-400 font-semibold  tracking-wide text-xs">Loading Blog...</p>
        </div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen bg-white font-sans text-gray-900">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-40">
          <p className="text-gray-400 font-semibold  tracking-wide text-sm mb-4">{error || 'Blog not found'}</p>
          <Link href="/blogs" className="text-purple-600 hover:text-pink-600 font-bold  tracking-wider">
            ← Back to Blogs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      <Navbar />

      {/* Hero Image */}
      {blog.image && (
        <div className="max-w-4xl mx-auto px-6 pt-28 pb-6">
          <div className="relative w-full aspect-[16/8] rounded-2xl overflow-hidden shadow-lg">
            <Image
              src={blog.image}
              alt={blog.title}
              fill
              className="object-cover"
              priority
             sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
          </div>
        </div>
      )}

      {/* Blog Content */}
      <article className={`max-w-3xl mx-auto px-6 py-12 ${!blog.image ? 'pt-28' : ''}`}>
        {/* Breadcrumb */}
        <nav className="flex text-xs font-bold  tracking-wide text-gray-400 mb-8 gap-2">
          <Link href="/" className="hover:text-gray-900 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/blogs" className="hover:text-gray-900 transition-colors">Blog</Link>
          <span>/</span>
          <span className="text-gray-700 truncate max-w-[200px]">{blog.title}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-3 mb-5 items-center">
            {blog.category && (
              <span className="text-xs font-semibold  tracking-wide text-[#A855F7] bg-purple-50 px-3 py-1.5 rounded-full">
                {blog.category}
              </span>
            )}
            <span className="text-xs font-semibold  tracking-wide text-gray-400">
              {new Date(blog.createdAt).toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </span>
          </div>

          <h1 className="text-2xl md:text-4xl font-semibold  tracking-tight text-gray-900 mb-5 leading-[1.15]">
            {blog.title}
          </h1>

          <p className="text-base text-gray-500 italic mb-5 leading-relaxed">
            {blog.description}
          </p>

          {blog.author && (
            <div className="flex items-center gap-3 pb-6 border-b border-gray-100">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="text-purple-600 font-semibold text-xs">{blog.author.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <p className="text-xs font-semibold  tracking-wide text-gray-900">By {blog.author}</p>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <ScrollAnimate animation="fade-in" className="prose prose-lg max-w-none mb-12">
          <div
            className="text-gray-700 leading-relaxed space-y-6 text-base md:text-lg"
            dangerouslySetInnerHTML={{ __html: blog.content }}
          />
        </ScrollAnimate>

        {/* Gallery Images */}
        {blog.images && blog.images.length > 0 && (
          <div className="my-16">
            <h3 className="text-2xl font-semibold  tracking-tight text-gray-900 mb-8">Gallery</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {blog.images.map((img, idx) => (
                <div key={idx} className="aspect-square rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow">
                  <Image
                    src={img}
                    alt={`Gallery image ${idx + 1}`}
                    width={300}
                    height={300}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Video */}
        {blog.videoUrl && (
          <div className="my-16">
            <h3 className="text-2xl font-semibold  tracking-tight text-gray-900 mb-8">Featured video</h3>
            <div className="relative w-full pt-[56.25%] rounded-2xl overflow-hidden border border-gray-100">
              {blog.videoUrl.includes('youtube.com') || blog.videoUrl.includes('youtu.be') ? (
                <iframe
                  className="absolute top-0 left-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${blog.videoUrl.split('v=')[1] || blog.videoUrl.split('/').pop()}`}
                  title="Blog video"
                  allowFullScreen
                ></iframe>
              ) : (
                <video
                  className="absolute top-0 left-0 w-full h-full object-cover"
                  controls
                  src={blog.videoUrl}
                />
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        {blog.tags && blog.tags.length > 0 && (
          <div className="my-12 pt-12 border-t border-gray-200">
            <div className="flex flex-wrap gap-3">
              {blog.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-xs font-bold  tracking-wide text-gray-500 bg-gray-100 px-3 py-2 rounded-full hover:bg-purple-100 hover:text-purple-600 transition-colors cursor-pointer"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Back Link */}
        <div className="mt-16 pt-12 border-t border-gray-200">
          <Link
            href="/blogs"
            className="inline-flex items-center gap-2 text-purple-600 hover:text-pink-600 font-semibold  text-sm tracking-wide transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Blogs
          </Link>
        </div>
      </article>
    </div>
  );
}
