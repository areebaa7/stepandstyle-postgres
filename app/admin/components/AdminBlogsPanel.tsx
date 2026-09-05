'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AdminEmptyState, AdminErrorState, AdminLoadingState, AdminNotice } from './AdminAsyncState';
import { AdminFilterSearch, AdminFilterSelect } from './AdminFilterControl';

interface Blog {
  id: string;
  slug: string;
  title: string;
  description: string;
  image?: string;
  author?: string;
  category?: string;
  isPublished: boolean;
  createdAt: string;
}

export default function AdminBlogsPanel() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sort, setSort] = useState('NEWEST');
  const [deleteStatus, setDeleteStatus] = useState<{ type: 'idle' | 'error' | 'success'; message: string }>({
    type: 'idle',
    message: '',
  });

  const categories = useMemo(() => Array.from(new Set(
    blogs.map((blog) => blog.category?.trim()).filter((category): category is string => Boolean(category)),
  )).sort((left, right) => left.localeCompare(right)), [blogs]);
  const publicationStates = useMemo(() => [
    ...(blogs.some((blog) => blog.isPublished) ? [{ value: 'PUBLISHED', label: 'Published' }] : []),
    ...(blogs.some((blog) => !blog.isPublished) ? [{ value: 'DRAFT', label: 'Draft' }] : []),
  ], [blogs]);

  const filteredBlogs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const list = blogs.filter((blog) => {
      const matchesSearch = !normalizedSearch || [blog.title, blog.slug, blog.author, blog.category, blog.description]
        .some((value) => value?.toLowerCase().includes(normalizedSearch));
      const matchesStatus = statusFilter === 'ALL'
        || (statusFilter === 'PUBLISHED' ? blog.isPublished : !blog.isPublished);
      const matchesCategory = categoryFilter === 'ALL' || blog.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
    return [...list].sort((left, right) => {
      if (sort === 'OLDEST') return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      if (sort === 'TITLE') return left.title.localeCompare(right.title);
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }, [blogs, categoryFilter, search, sort, statusFilter]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setSort('NEWEST');
  };

  useEffect(() => {
    const fetchAuthToken = async () => {
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          if (data.user?.role === 'ADMIN') {
            setAuthToken('admin-token');
          }
        }
      } catch (err) {
        console.error('Auth error:', err);
      }
    };

    fetchAuthToken();
  }, []);

  useEffect(() => {
    if (!authToken) return;

    const fetchBlogs = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/blogs', {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch blogs');
        }

        const data = await response.json();
        setBlogs(data.data || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch blogs');
        setBlogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, [authToken]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this blog?')) {
      return;
    }

    setIsDeletingId(id);
    setDeleteStatus({ type: 'idle', message: '' });

    try {
      const response = await fetch(`/api/admin/blogs/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete blog');
      }

      setBlogs(blogs.filter(blog => blog.id !== id));
      setDeleteStatus({ type: 'success', message: 'Blog deleted successfully' });
    } catch (err) {
      setDeleteStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to delete blog',
      });
    } finally {
      setIsDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Blog Management</h2>
          <p className="text-sm text-gray-500">
            Create and manage blog posts with images, videos, and rich content.
          </p>
        </div>
        <Link
          href="/admin/blogs/new"
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-5 py-2 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition"
        >
          + New Blog
        </Link>
      </div>

      {deleteStatus.type !== 'idle' && (
        <AdminNotice type={deleteStatus.type} message={deleteStatus.message} />
      )}

      {!loading && !error && blogs.length > 0 && (
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm" aria-label="Blog filters">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <AdminFilterSearch label="Search blogs" className="xl:col-span-2" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Title, slug, author or category" />
            <AdminFilterSelect label="Publication state" aria-label="Blog status filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="ALL">All publication states</option>
              {publicationStates.map((state) => <option key={state.value} value={state.value}>{state.label}</option>)}
            </AdminFilterSelect>
            <AdminFilterSelect label="Category" aria-label="Blog category filter" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="ALL">All categories</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </AdminFilterSelect>
            <AdminFilterSelect label="Sort by" aria-label="Sort blogs" value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="NEWEST">Newest first</option>
              <option value="OLDEST">Oldest first</option>
              <option value="TITLE">Title A-Z</option>
            </AdminFilterSelect>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-sm text-gray-500"><span className="font-semibold text-gray-900">{filteredBlogs.length}</span> of {blogs.length} blogs shown</p>
            {(search || statusFilter !== 'ALL' || categoryFilter !== 'ALL' || sort !== 'NEWEST') && <button type="button" onClick={clearFilters} className="rounded-xl px-3 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-50">Clear filters</button>}
          </div>
        </section>
      )}

      {loading ? (
        <AdminLoadingState label="Loading blogs..." />
      ) : error ? (
        <AdminErrorState message={error} />
      ) : blogs.length === 0 ? (
        <AdminEmptyState
          title="No blogs created yet"
          description="Publish an article to populate the public blog section."
          action={{ label: 'Create first blog', href: '/admin/blogs/new' }}
        />
      ) : filteredBlogs.length === 0 ? (
        <AdminEmptyState title="No blogs match these filters" description="Change or clear the filters to see more posts." action={{ label: 'Clear filters', onClick: clearFilters }} />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredBlogs.map((blog) => (
            <div key={blog.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col h-full">
              <div className="w-full h-40 bg-gray-50 rounded-xl overflow-hidden mb-4 relative">
                {blog.image ? (
                  <Image src={blog.image} alt={blog.title} fill className="object-cover"  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{blog.title}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest whitespace-nowrap ${
                    blog.isPublished
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {blog.isPublished ? 'Published' : 'Draft'}
                  </span>
                </div>
                <p className="text-xs text-purple-600 font-mono">/{blog.slug}</p>
                <p className="text-sm text-gray-600 line-clamp-2">{blog.description || 'No description provided.'}</p>
                <div className="flex gap-2 text-xs text-gray-500 pt-2">
                  {blog.author && <span>By {blog.author}</span>}
                  {blog.category && <span>•</span>}
                  {blog.category && <span>{blog.category}</span>}
                </div>
                <p className="text-xs text-gray-400">Created: {formatDate(blog.createdAt)}</p>
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 justify-center">
                <Link
                  href={`/admin/blogs/${blog.id}`}
                  className="px-6 py-1.5 text-sm border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 font-medium transition"
                >
                  Edit
                </Link>
                <button
                  className="px-3 py-1.5 text-sm border border-red-600 text-red-600 rounded-lg hover:bg-red-50 font-medium disabled:opacity-60 transition"
                  onClick={() => handleDelete(blog.id)}
                  disabled={isDeletingId === blog.id}
                >
                  {isDeletingId === blog.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
