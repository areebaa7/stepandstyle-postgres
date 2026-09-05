'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';

interface BlogForm {
  title: string;
  description: string;
  content: string;
  image: string;
  images: string[];
  videoUrl: string;
  author: string;
  category: string;
  tags: string[];
  isPublished: boolean;
}

export default function BlogFormPage() {
  const router = useRouter();
  const params = useParams();
  const blogId = params.id as string;
  const isNew = blogId === 'new';

  const [form, setForm] = useState<BlogForm>({
    title: '',
    description: '',
    content: '',
    image: '',
    images: [],
    videoUrl: '',
    author: '',
    category: '',
    tags: [],
    isPublished: false,
  });

  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    const fetchAuthToken = async () => {
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          if (data.user?.role === 'ADMIN') {
            setAuthToken('admin-token');
          } else {
            router.push('/');
          }
        } else {
          router.push('/');
        }
      } catch {
        router.push('/');
      }
    };

    fetchAuthToken();
  }, [router]);

  useEffect(() => {
    if (!authToken || isNew) return;

    const fetchBlog = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/blogs/${blogId}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch blog');
        }

        const data = await response.json();
        setForm({
          title: data.data.title || '',
          description: data.data.description || '',
          content: data.data.content || '',
          image: data.data.image || '',
          images: data.data.images || [],
          videoUrl: data.data.videoUrl || '',
          author: data.data.author || '',
          category: data.data.category || '',
          tags: data.data.tags || [],
          isPublished: data.data.isPublished || false,
        });
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch blog');
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [authToken, blogId, isNew]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm({
        ...form,
        tags: [...form.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setForm({
      ...form,
      tags: form.tags.filter(t => t !== tag),
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isMainImage = true) => {
    const file = e.target.files?.[0];
    if (!file || !authToken) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/blogs/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      const data = await response.json();
      
      if (isMainImage) {
        setForm({
          ...form,
          image: data.url,
        });
      } else {
        setForm({
          ...form,
          images: [...form.images, data.url],
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (url: string) => {
    setForm({
      ...form,
      images: form.images.filter(img => img !== url),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title || !form.description || !form.content) {
      setError('Title, description, and content are required');
      return;
    }

    if (!authToken) {
      setError('Not authenticated');
      return;
    }

    try {
      setSaving(true);
      const method = isNew ? 'POST' : 'PUT';
      const url = isNew ? '/api/admin/blogs' : `/api/admin/blogs/${blogId}`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save blog');
      }

      router.push('/admin/blogs');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save blog');
    } finally {
      setSaving(false);
    }
  };

  if (!authToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Checking authorization...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tight">
            {isNew ? 'Create New Blog' : 'Edit Blog'}
          </h1>
          <p className="text-gray-500 mt-2">
            {isNew ? 'Create a new blog post' : 'Update this blog post'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-8 space-y-8">
              {/* Title */}
              <div>
                <label className="block text-sm font-black uppercase tracking-wider text-gray-900 mb-3">
                  Blog Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleInputChange}
                  placeholder="Enter blog title"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-black uppercase tracking-wider text-gray-900 mb-3">
                  Short Description *
                </label>
                <input
                  type="text"
                  name="description"
                  value={form.description}
                  onChange={handleInputChange}
                  placeholder="Brief description for preview"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  required
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-black uppercase tracking-wider text-gray-900 mb-3">
                  Content *
                </label>
                <textarea
                  name="content"
                  value={form.content}
                  onChange={handleInputChange}
                  placeholder="Enter blog content"
                  rows={10}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent font-mono text-sm"
                  required
                />
              </div>

              {/* Author */}
              <div>
                <label className="block text-sm font-black uppercase tracking-wider text-gray-900 mb-3">
                  Author
                </label>
                <input
                  type="text"
                  name="author"
                  value={form.author}
                  onChange={handleInputChange}
                  placeholder="Blog author name"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-black uppercase tracking-wider text-gray-900 mb-3">
                  Category
                </label>
                <input
                  type="text"
                  name="category"
                  value={form.category}
                  onChange={handleInputChange}
                  placeholder="e.g., Lifestyle, Fashion, Tips"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-black uppercase tracking-wider text-gray-900 mb-3">
                  Tags
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="Type tag and press Enter"
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700"
                  >
                    Add
                  </button>
                </div>
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.tags.map((tag) => (
                      <div
                        key={tag}
                        className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-3 py-1 rounded-full"
                      >
                        <span className="text-sm font-bold">{tag}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="text-purple-900 hover:text-purple-600"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Main Image */}
              <div>
                <label className="block text-sm font-black uppercase tracking-wider text-gray-900 mb-3">
                  Main Cover Image
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
                    onChange={(e) => handleFileUpload(e, true)}
                    disabled={uploading}
                    className="hidden"
                    id="main-image"
                  />
                  <label htmlFor="main-image" className="cursor-pointer">
                    {uploading ? (
                      <p className="text-gray-600">Uploading...</p>
                    ) : (
                      <>
                        <p className="text-gray-600 font-bold">Click to upload main image</p>
                        <p className="text-gray-500 text-sm">PNG, JPG, GIF up to 10MB</p>
                      </>
                    )}
                  </label>
                </div>
                {form.image && (
                  <div className="mt-4 relative w-48 h-32">
                    <Image
                      src={form.image}
                      alt="Main image"
                      fill
                      className="object-cover rounded-lg"
                     sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, image: '' })}
                      className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Gallery Images */}
              <div>
                <label className="block text-sm font-black uppercase tracking-wider text-gray-900 mb-3">
                  Gallery Images
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
                    onChange={(e) => handleFileUpload(e, false)}
                    disabled={uploading}
                    className="hidden"
                    id="gallery-image"
                  />
                  <label htmlFor="gallery-image" className="cursor-pointer">
                    {uploading ? (
                      <p className="text-gray-600">Uploading...</p>
                    ) : (
                      <>
                        <p className="text-gray-600 font-bold">Click to upload gallery images</p>
                        <p className="text-gray-500 text-sm">Add multiple images to gallery</p>
                      </>
                    )}
                  </label>
                </div>
                {form.images.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    {form.images.map((img, idx) => (
                      <div key={idx} className="relative w-full aspect-square">
                        <Image
                          src={img}
                          alt={`Gallery ${idx}`}
                          fill
                          className="object-cover rounded-lg"
                         sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(img)}
                          className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Video URL */}
              <div>
                <label className="block text-sm font-black uppercase tracking-wider text-gray-900 mb-3">
                  Video URL
                </label>
                <input
                  type="url"
                  name="videoUrl"
                  value={form.videoUrl}
                  onChange={handleInputChange}
                  placeholder="YouTube or video URL"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                />
              </div>

              {/* Publish Status */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isPublished"
                    checked={form.isPublished}
                    onChange={handleInputChange}
                    className="w-5 h-5 text-purple-600 rounded"
                  />
                  <span className="font-black uppercase tracking-wider text-gray-900">
                    Publish this blog
                  </span>
                </label>
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-8 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => router.push('/admin/blogs')}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-black uppercase tracking-wider rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-purple-600 text-white font-black uppercase tracking-wider rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : isNew ? 'Create Blog' : 'Update Blog'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
