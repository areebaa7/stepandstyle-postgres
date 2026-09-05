'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { CollectionDTO, Gender } from '@/types/product';
import FileUpload from './FileUpload';
import { AdminEmptyState, AdminLoadingState, AdminNotice } from './AdminAsyncState';

interface CollectionFormState {
  name: string;
  slug: string;
  description: string;
  image: string;
  targetGender: 'MEN' | 'WOMEN' | 'KIDS' | 'UNISEX';
  sendPromoEmail: boolean;
}

const defaultFormState: CollectionFormState = {
  name: '',
  slug: '',
  description: '',
  image: '',
  targetGender: 'UNISEX',
  sendPromoEmail: false,
};

export default function AdminCollectionsPanel() {
  const [collections, setCollections] = useState<CollectionDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<{ type: 'idle' | 'error' | 'success'; message: string }>({
    type: 'idle',
    message: '',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [formValues, setFormValues] = useState<CollectionFormState>(defaultFormState);
  const [selectedCollection, setSelectedCollection] = useState<CollectionDTO | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const fetchCollections = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/collections');
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load collections.');
      }
      setCollections(payload.collections || []);
    } catch (error) {
      console.error('Failed to fetch collections', error);
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to load collections.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial server synchronization for this admin panel.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCollections();
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedCollection(null);
    setFormValues(defaultFormState);
    setIsModalOpen(true);
    setStatus({ type: 'idle', message: '' });
  };

  const openEditModal = (collection: CollectionDTO) => {
    setModalMode('edit');
    setSelectedCollection(collection);
    setFormValues({
      name: collection.name,
      slug: collection.slug,
      description: collection.description || '',
      image: collection.image || '',
      targetGender: collection.targetGender || 'UNISEX',
      sendPromoEmail: false,
    });
    setIsModalOpen(true);
    setStatus({ type: 'idle', message: '' });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormValues(defaultFormState);
    setSelectedCollection(null);
    setStatus({ type: 'idle', message: '' });
  };

  const handleInputChange = <Key extends keyof CollectionFormState>(
    key: Key,
    value: CollectionFormState[Key],
  ) => {
    setFormValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: 'idle', message: '' });

    try {
      const endpoint =
        modalMode === 'edit' && selectedCollection
          ? `/api/collections/${selectedCollection.id}`
          : '/api/collections';

      const method = modalMode === 'edit' ? 'PATCH' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formValues),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save collection.');
      }

      setStatus({ type: 'success', message: 'Collection saved successfully.' });
      closeModal();
      fetchCollections();
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to save collection.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this collection? This will fail if products are linked to it.')) {
      return;
    }

    setIsDeletingId(id);
    setStatus({ type: 'idle', message: '' });

    try {
      const response = await fetch(`/api/collections/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete collection.');
      }

      setStatus({ type: 'success', message: 'Collection deleted successfully.' });
      fetchCollections();
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to delete collection.',
      });
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Collections Management</h2>
          <p className="text-sm text-gray-500">
            Organize your products into collections (e.g., Slippers, Bridal, Heels).
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-5 py-2 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition"
        >
          + Add Collection
        </button>
      </div>

      {status.type !== 'idle' && (
        <AdminNotice type={status.type} message={status.message} />
      )}

      {isLoading ? (
        <AdminLoadingState label="Loading collections..." />
      ) : collections.length === 0 ? (
        <AdminEmptyState
          title="No collections found"
          description="Create your first collection to start organizing products."
          action={{ label: 'Add collection', onClick: openCreateModal }}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <div key={collection.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col h-full">
              <div className="w-full h-32 bg-gray-50 rounded-xl overflow-hidden mb-4 relative">
                {collection.image ? (
                  <Image src={collection.image} alt={collection.name} fill className="object-cover"  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold text-gray-900">{collection.name}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${
                    collection.targetGender === 'MEN' ? 'bg-blue-100 text-blue-700' :
                    collection.targetGender === 'WOMEN' ? 'bg-pink-100 text-pink-700' :
                    collection.targetGender === 'KIDS' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {collection.targetGender}
                  </span>
                </div>
                <p className="text-xs text-purple-600 font-mono">/{collection.slug}</p>
                <p className="text-sm text-gray-500 line-clamp-2">{collection.description || 'No description provided.'}</p>
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                <button
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-600 text-black rounded-lg hover:bg-gray-400 font-medium"
                  onClick={() => openEditModal(collection)}
                >
                  Edit
                </button>
                <button
                  className="flex-1 px-3 py-1.5 text-sm border border-red-600 text-red-600 rounded-lg hover:bg-red-400 font-medium disabled:opacity-60"
                  onClick={() => handleDelete(collection.id)}
                  disabled={isDeletingId === collection.id}
                >
                  {isDeletingId === collection.id ? 'Deleting...' : 'Remove'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[calc(100vh-2rem)] flex flex-col border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Sticky Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80 backdrop-blur-sm">
              <h3 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {modalMode === 'create' ? 'Create New Collection' : 'Edit Collection Details'}
              </h3>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-full bg-gray-200/60 text-gray-600 hover:bg-gray-200 hover:text-gray-900 flex items-center justify-center transition-all text-xs"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <form id="collectionForm" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-purple-600 uppercase tracking-widest mb-1.5">Collection Name *</label>
                  <input
                    type="text"
                    required
                    value={formValues.name}
                    onChange={(e) => {
                      handleInputChange('name', e.target.value);
                      if (modalMode === 'create') {
                        handleInputChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
                      }
                    }}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-400 focus:bg-white outline-none transition-all placeholder:text-gray-400 hover:border-gray-300"
                    placeholder="e.g. Bridal Heels"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-purple-600 uppercase tracking-widest mb-1.5">Slug *</label>
                  <input
                    type="text"
                    required
                    value={formValues.slug}
                    onChange={(e) => handleInputChange('slug', e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-400 focus:bg-white outline-none transition-all placeholder:text-gray-400 hover:border-gray-300"
                    placeholder="bridal-heels"
                  />
                </div>

                <FileUpload
                  label="Collection Image"
                  accept="image"
                  value={formValues.image}
                  onChange={(url) => handleInputChange('image', url)}
                  placeholder="JPG, PNG, WebP — drag & drop or browse"
                />

                <div>
                  <label className="block text-xs font-black text-purple-600 uppercase tracking-widest mb-1.5">Description</label>
                  <textarea
                    value={formValues.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-400 focus:bg-white outline-none transition-all placeholder:text-gray-400 hover:border-gray-300 resize-none"
                    rows={3}
                    placeholder="Describe this footwear collection..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-purple-600 uppercase tracking-widest mb-1.5">Target Gender</label>
                  <select
                    value={formValues.targetGender}
                    onChange={(e) => handleInputChange('targetGender', e.target.value as Gender)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-400 focus:bg-white outline-none transition-all hover:border-gray-300 appearance-none bg-no-repeat bg-right pr-10"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23a855f7\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundSize: '1.5em' }}
                  >
                    <option value="MEN">Men</option>
                    <option value="WOMEN">Women</option>
                    <option value="KIDS">Kids</option>
                    <option value="UNISEX">Unisex</option>
                  </select>
                </div>

                {modalMode === 'create' && (
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer group p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          checked={formValues.sendPromoEmail}
                          onChange={(e) => handleInputChange('sendPromoEmail', e.target.checked)}
                          className="w-5 h-5 border-2 border-slate-300 rounded text-pink-600 focus:ring-pink-500 transition-colors"
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-700 group-hover:text-pink-600 transition-colors">Send Promo Email to all users</span>
                    </label>
                  </div>
                )}
              </form>
            </div>

            {/* Sticky Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/80 backdrop-blur-sm">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-100 active:bg-gray-200 transition-all text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="collectionForm"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {isSubmitting ? 'Saving...' : modalMode === 'create' ? 'Create Collection' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
