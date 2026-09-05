'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { Plus, Trash2, Edit2, Check, MoveUp, MoveDown } from 'lucide-react';
import FileUpload from './FileUpload';
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from './AdminAsyncState';

type Banner = {
  id: string;
  category: string;
  desktopImageUrl: string;
  mobileImageUrl: string;
  desktopImageSlot: 1 | 2 | null;
  mobileImageSlot: 1 | 2 | null;
  title: string | null;
  subtitle: string | null;
  textPosition: string;
  ctaText: string | null;
  ctaLink: string | null;
  isActive: boolean;
  order: number;
  startDate: string | null;
  endDate: string | null;
};

const CATEGORIES = [
  { id: 'HOME_MAIN', label: 'Main Hero Slider' },
  { id: 'WOMEN_SECTION', label: 'Women Section' },
  { id: 'MEN_SECTION', label: 'Men Section' },
  { id: 'KIDS_SECTION', label: 'Kids Section' },
  { id: 'SALE_BANNER', label: 'Sale Event Banner' }
];

const toDateTimeLocalValue = (value: string | null | undefined) => {
  if (!value) return '';
  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
};

const fromDateTimeLocalValue = (value: string) => value ? new Date(value).toISOString() : null;

export default function AdminBannerPanel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentBanner, setCurrentBanner] = useState<Partial<Banner>>({});
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const desktopPreviewImage = (currentBanner.desktopImageSlot ?? 1) === 2
    ? currentBanner.mobileImageUrl
    : currentBanner.desktopImageUrl;
  const mobilePreviewImage = (currentBanner.mobileImageSlot ?? 2) === 1
    ? currentBanner.desktopImageUrl
    : currentBanner.mobileImageUrl;
  const activePreviewImage = previewMode === 'desktop' ? desktopPreviewImage : mobilePreviewImage;

  const fetchBanners = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError('');
      const res = await fetch('/api/banners');
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load banners.');
      setBanners(data.banners || []);
    } catch (error) {
      console.error('Failed to fetch banners', error);
      setLoadError(error instanceof Error ? error.message : 'Failed to load banners.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial server synchronization for this admin panel.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchBanners();
  }, [fetchBanners]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBanner.desktopImageUrl || !currentBanner.mobileImageUrl) {
      alert('Please upload both desktop and mobile banner images.');
      return;
    }

    const isNew = !currentBanner.id;
    const url = isNew ? '/api/banners' : `/api/banners/${currentBanner.id}`;
    const method = isNew ? 'POST' : 'PUT';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentBanner),
      });
      const data = await res.json();
      if (data.success) {
        setIsEditing(false);
        fetchBanners();
      } else {
        alert(data.error || 'Failed to save banner');
      }
    } catch (error) {
      console.error('Error saving banner', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;
    try {
      const res = await fetch(`/api/banners/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchBanners();
      }
    } catch (error) {
      console.error('Error deleting banner', error);
    }
  };

  const startNewBanner = () => {
    setCurrentBanner({
      category: 'HOME_MAIN',
      textPosition: 'OVERLAY',
      isActive: true,
      order: 0,
      desktopImageUrl: '',
      mobileImageUrl: '',
      desktopImageSlot: 1,
      mobileImageSlot: 2,
    });
    setIsEditing(true);
  };

  const moveOrder = async (id: string, currentOrder: number, direction: 'up' | 'down') => {
    const newOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1;
    await fetch(`/api/banners/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: newOrder }),
    });
    fetchBanners();
  };

  if (isLoading) {
    return <AdminLoadingState label="Loading banners..." />;
  }

  if (loadError && banners.length === 0) {
    return <AdminErrorState message={loadError} onRetry={() => void fetchBanners()} />;
  }

  if (isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {currentBanner.id ? 'Edit Banner' : 'Create New Banner'}
          </h2>
          <button
            onClick={() => setIsEditing(false)}
            className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Cancel
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <form onSubmit={handleSave} className="space-y-6 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                  <select
                    value={currentBanner.category || ''}
                    onChange={(e) => setCurrentBanner({ ...currentBanner, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Text Position</label>
                  <select
                    value={currentBanner.textPosition || 'OVERLAY'}
                    onChange={(e) => setCurrentBanner({ ...currentBanner, textPosition: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="OVERLAY">On Image (Overlay)</option>
                    <option value="OUTSIDE_LEFT">Outside (Left of Image)</option>
                    <option value="OUTSIDE_RIGHT">Outside (Right of Image)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FileUpload
                  label="Image 1"
                  accept="image"
                  placeholder="Upload the first banner image option. Any dimensions are allowed."
                  value={currentBanner.desktopImageUrl || ''}
                  onChange={(url) => setCurrentBanner({ ...currentBanner, desktopImageUrl: url })}
                />
                <FileUpload
                  label="Image 2"
                  accept="image"
                  placeholder="Upload the second banner image option. Any dimensions are allowed."
                  value={currentBanner.mobileImageUrl || ''}
                  onChange={(url) => setCurrentBanner({ ...currentBanner, mobileImageUrl: url })}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Show on Desktop</label>
                  <select
                    value={currentBanner.desktopImageSlot ?? 1}
                    onChange={(e) => setCurrentBanner({ ...currentBanner, desktopImageSlot: Number(e.target.value) as 1 | 2 })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2"
                  >
                    <option value={1}>Image 1</option>
                    <option value={2}>Image 2</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Show on Mobile</label>
                  <select
                    value={currentBanner.mobileImageSlot ?? 2}
                    onChange={(e) => setCurrentBanner({ ...currentBanner, mobileImageSlot: Number(e.target.value) as 1 | 2 })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2"
                  >
                    <option value={1}>Image 1</option>
                    <option value={2}>Image 2</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Title (Optional)</label>
                  <input
                    type="text"
                    value={currentBanner.title || ''}
                    onChange={(e) => setCurrentBanner({ ...currentBanner, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g. Summer Collection"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Subtitle (Optional)</label>
                  <input
                    type="text"
                    value={currentBanner.subtitle || ''}
                    onChange={(e) => setCurrentBanner({ ...currentBanner, subtitle: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g. Up to 50% off"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">CTA Text (Optional)</label>
                  <input
                    type="text"
                    value={currentBanner.ctaText || ''}
                    onChange={(e) => setCurrentBanner({ ...currentBanner, ctaText: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g. Shop Now"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">CTA Link (Optional)</label>
                  <input
                    type="text"
                    value={currentBanner.ctaLink || ''}
                    onChange={(e) => setCurrentBanner({ ...currentBanner, ctaLink: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g. /products?gender=WOMEN"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Schedule Start Date (Optional)</label>
                  <input
                    type="datetime-local"
                    value={toDateTimeLocalValue(currentBanner.startDate)}
                    onChange={(e) => setCurrentBanner({ ...currentBanner, startDate: fromDateTimeLocalValue(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Schedule End Date (Optional)</label>
                  <input
                    type="datetime-local"
                    value={toDateTimeLocalValue(currentBanner.endDate)}
                    onChange={(e) => setCurrentBanner({ ...currentBanner, endDate: fromDateTimeLocalValue(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentBanner.isActive ?? true}
                    onChange={(e) => setCurrentBanner({ ...currentBanner, isActive: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Is Active</span>
                </label>

                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Order</label>
                  <input
                    type="number"
                    value={currentBanner.order || 0}
                    onChange={(e) => setCurrentBanner({ ...currentBanner, order: parseInt(e.target.value) || 0 })}
                    className="w-20 px-2 py-1 border border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 shadow-md transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" /> Save Banner
              </button>
            </div>
          </form>

          {/* Live Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="font-bold text-gray-800">Live Preview</h3>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setPreviewMode('desktop')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${previewMode === 'desktop' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Desktop
                </button>
                <button
                  onClick={() => setPreviewMode('mobile')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${previewMode === 'mobile' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Mobile
                </button>
              </div>
            </div>

            <div className={`relative overflow-hidden bg-gray-100 rounded-xl border border-gray-300 mx-auto transition-all duration-300 ${previewMode === 'mobile' ? 'w-[375px] h-[667px] flex flex-col' : 'w-full flex'}`}>
              
              {/* Desktop Side-by-Side (Outside Layout) */}
              {previewMode === 'desktop' && currentBanner.textPosition !== 'OVERLAY' ? (
                <div className="grid grid-cols-2 w-full min-h-[300px]">
                  <div className={`relative ${currentBanner.textPosition === 'OUTSIDE_LEFT' ? 'order-2' : 'order-1'}`}>
                    {desktopPreviewImage ? (
                      <Image src={desktopPreviewImage} alt="Preview" fill className="object-cover"  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-200">Image Area</div>
                    )}
                  </div>
                  <div className={`flex flex-col justify-center p-8 space-y-4 bg-white ${currentBanner.textPosition === 'OUTSIDE_LEFT' ? 'order-1' : 'order-2'}`}>
                    {currentBanner.title && (
                      <h2 className="text-gray-900 text-3xl font-black uppercase leading-none">{currentBanner.title}</h2>
                    )}
                    {currentBanner.subtitle && (
                      <p className="text-gray-500 text-sm font-light leading-relaxed max-w-sm">{currentBanner.subtitle}</p>
                    )}
                    {currentBanner.ctaText && (
                      <div className="mt-4">
                        <span className="inline-block bg-purple-100 text-purple-800 px-6 py-3 text-xs font-black uppercase tracking-widest shadow-sm cursor-pointer">
                          {currentBanner.ctaText}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Overlay Layout OR Mobile Layout */
                <div className={`relative w-full ${previewMode === 'desktop' ? 'aspect-[21/9]' : 'flex-1'}`}>
                  {activePreviewImage ? (
                    <Image src={activePreviewImage} alt="Preview" fill className="object-cover"  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                      {previewMode === 'desktop' ? 'Desktop Image Area' : 'Mobile Image Area'}
                    </div>
                  )}

                  {/* Overlay Content Preview */}
                  {(currentBanner.title || currentBanner.subtitle || currentBanner.ctaText) && (
                    <div className={`absolute inset-0 flex flex-col items-center text-center p-6 bg-black/20 ${previewMode === 'mobile' ? 'justify-end pb-12' : 'justify-center'}`}>
                      {currentBanner.title && (
                        <h2 className="text-white text-3xl md:text-5xl font-black mb-2 uppercase drop-shadow-lg">{currentBanner.title}</h2>
                      )}
                      {currentBanner.subtitle && (
                        <p className="text-white text-sm md:text-lg mb-6 font-medium drop-shadow-md max-w-md">{currentBanner.subtitle}</p>
                      )}
                      {currentBanner.ctaText && (
                        <span className="bg-white text-black px-8 py-3 text-xs md:text-sm font-black uppercase tracking-widest shadow-xl">
                          {currentBanner.ctaText}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Group banners by category
  const groupedBanners = CATEGORIES.map(cat => ({
    ...cat,
    banners: banners.filter(b => b.category === cat.id).sort((a, b) => a.order - b.order)
  }));

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Banner Manager</h2>
          <p className="text-gray-500 text-sm mt-1">Manage website banners and sliders.</p>
        </div>
        <button
          onClick={startNewBanner}
          className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus className="w-5 h-5" /> Add New Banner
        </button>
      </div>

      <div className="space-y-10">
        {groupedBanners.map(group => group.banners.length > 0 && (
          <div key={group.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center justify-between">
              {group.label}
              <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{group.banners.length} banners</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {group.banners.map((banner) => (
                <div key={banner.id} className={`group relative rounded-xl border overflow-hidden transition-all ${banner.isActive ? 'border-gray-200 hover:border-purple-300 shadow-sm hover:shadow-md' : 'border-gray-200 opacity-60 grayscale hover:grayscale-0'}`}>
                  <div className="aspect-[16/9] relative bg-gray-100">
                    <Image
                      src={(banner.desktopImageSlot ?? 1) === 2 ? banner.mobileImageUrl : banner.desktopImageUrl}
                      alt={banner.title || 'Banner'}
                      fill
                      className="object-cover"
                     sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                    {!banner.isActive && (
                      <div className="absolute top-2 left-2 bg-gray-800/80 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm">INACTIVE</div>
                    )}
                    {banner.startDate && new Date(banner.startDate) > new Date() && (
                      <div className="absolute top-2 left-2 bg-blue-600/90 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm">SCHEDULED</div>
                    )}
                  </div>
                  <div className="p-4">
                    <h4 className="font-bold text-gray-900 truncate">{banner.title || 'Untitled Banner'}</h4>
                    <p className="text-xs text-gray-500 mt-1 truncate">{banner.subtitle || 'No subtitle'}</p>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center space-x-1">
                        <button onClick={() => moveOrder(banner.id, banner.order, 'up')} className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded">
                          <MoveUp className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-medium text-gray-600 w-4 text-center">{banner.order}</span>
                        <button onClick={() => moveOrder(banner.id, banner.order, 'down')} className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded">
                          <MoveDown className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setCurrentBanner(banner); setIsEditing(true); }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(banner.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {banners.length === 0 && (
          <AdminEmptyState
            title="No banners found"
            description="Create a banner to start managing homepage campaigns."
            action={{ label: 'Create first banner', onClick: startNewBanner }}
          />
        )}
      </div>
    </div>
  );
}
