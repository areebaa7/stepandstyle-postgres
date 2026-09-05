'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';

const MAX_GALLERY_IMAGES = 12;
interface MultiFileUploadProps {
  /** Current value — comma-separated URL string */
  value: string;
  /** Called with updated comma-separated URLs */
  onChange: (urls: string) => void;
  /** Label shown above the upload area */
  label: string;
  /** Optional placeholder text */
  placeholder?: string;
  /** Optional overlay rendered at the bottom of every thumbnail (e.g. per-image controls) */
  thumbnailOverlay?: (url: string) => ReactNode;
  /** Set to false when the parent renders its own (e.g. larger) preview list */
  showPreviewGrid?: boolean;
}

export default function MultiFileUpload({ value, onChange, label, placeholder, thumbnailOverlay, showPreviewGrid = true }: MultiFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState('');

  const currentUrls = value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    if (fileArray.length > 10 || currentUrls.length + fileArray.length > MAX_GALLERY_IMAGES) {
      setError(`Upload at most 10 files at once and keep the gallery to ${MAX_GALLERY_IMAGES} images.`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setTotalFiles(fileArray.length);
    setUploadedCount(0);
    setError('');

    try {
      const formData = new FormData();
      fileArray.forEach((file) => formData.append('files', file));
      const newUrls = await new Promise<string[]>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              setUploadProgress(Math.round((e.loaded / e.total) * 100));
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const data = JSON.parse(xhr.responseText);
              if (!Array.isArray(data.urls)) return reject(new Error('Upload returned no file URLs.'));
              resolve(data.urls);
            } else {
              try {
                const errData = JSON.parse(xhr.responseText);
                reject(new Error(errData.error || 'Upload failed'));
              } catch {
                reject(new Error('Upload failed'));
              }
            }
          });

          xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
          xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

          xhr.open('POST', '/api/uploads/media');
          xhr.withCredentials = true;
          xhr.send(formData);
      });

    if (newUrls.length > 0) {
      const updated = [...currentUrls, ...newUrls];
      onChange(updated.join(', '));
      setUploadedCount(newUrls.length);
    }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setTotalFiles(0);
      setUploadedCount(0);
    }
  }, [currentUrls, onChange]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) uploadFiles(files);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) uploadFiles(files);
  };

  const handleRemove = (urlToRemove: string) => {
    const updated = currentUrls.filter((u) => u !== urlToRemove);
    onChange(updated.join(', '));
  };

  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-black text-purple-600 uppercase mb-1">{label}</label>

      {/* Thumbnails grid */}
      {showPreviewGrid && currentUrls.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {currentUrls.map((url, idx) => (
            <div
              key={`${url}-${idx}`}
              className="relative group rounded-lg overflow-hidden border border-purple-100 bg-gray-50 aspect-square"
            >
              <Image
                src={url}
                alt={`Gallery image ${idx + 1}`}
                fill
                className="object-cover"
                unoptimized
               sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
              {thumbnailOverlay && (
                <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-[1px] px-1 py-1">
                  {thumbnailOverlay(url)}
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                <button
                  type="button"
                  onClick={() => handleRemove(url)}
                  className="w-7 h-7 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg hover:bg-red-600 transition-colors flex items-center justify-center pointer-events-auto"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative cursor-pointer rounded-xl border-2 border-dashed transition-all
          flex flex-col items-center justify-center gap-1.5 py-4 px-3
          ${isDragOver
            ? 'border-purple-500 bg-purple-50 scale-[1.01]'
            : 'border-purple-200 bg-white hover:border-purple-400 hover:bg-purple-50/40'
          }
          ${isUploading ? 'pointer-events-none' : ''}
        `}
      >
        {isUploading ? (
          <>
            <div className="w-full max-w-[180px] bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-[10px] font-semibold text-purple-600">
              Uploading {uploadedCount}/{totalFiles} ({uploadProgress}%)
            </p>
          </>
        ) : (
          <>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-[10px] font-bold text-gray-600 text-center">
              Drop images or <span className="text-purple-600 underline underline-offset-2">browse</span>
            </p>
            <p className="text-[9px] text-gray-400">
              {placeholder || 'JPG, PNG, WebP, AVIF or GIF · 10 MB each · 12 total'}
            </p>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {error && (
        <p className="text-xs text-red-600 font-medium">{error}</p>
      )}
    </div>
  );
}
