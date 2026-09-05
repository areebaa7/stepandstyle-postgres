'use client';

import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';

interface FileUploadProps {
  /** Current value — a single URL string */
  value: string;
  /** Called with the uploaded URL (or empty string to clear) */
  onChange: (url: string) => void;
  /** "image" or "video" — determines accepted types */
  accept: 'image' | 'video';
  /** Label shown above the upload area */
  label: string;
  /** Optional placeholder text */
  placeholder?: string;
  /** Optional custom class for the label */
  labelClassName?: string;
}

export default function FileUpload({ value, onChange, accept, label, placeholder, labelClassName }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState('');

  const acceptStr = accept === 'image'
    ? 'image/jpeg,image/png,image/gif,image/webp,image/avif'
    : 'video/mp4,video/webm,video/quicktime';

  const uploadFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      const formData = new FormData();
      formData.append('files', file);

      // Use XMLHttpRequest for progress tracking
      const uploadedUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const data = JSON.parse(xhr.responseText);
            if (!Array.isArray(data.urls) || typeof data.urls[0] !== 'string') {
              reject(new Error('Upload returned no file URL.'));
              return;
            }
            resolve(data.urls[0]);
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

      onChange(uploadedUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [onChange]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    // Reset input so re-selecting the same file triggers onChange
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

    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleClear = () => {
    onChange('');
    setError('');
  };

  return (
    <div className="space-y-2">
      <label className={labelClassName || 'block text-sm font-semibold text-gray-700'}>{label}</label>

      {/* Preview */}
      {value && (
        <div className="relative group rounded-xl overflow-hidden border border-purple-200 bg-gray-50">
          {accept === 'image' ? (
            <div className="relative w-full h-32">
              <Image
                src={value}
                alt="Uploaded preview"
                fill
                className="object-contain"
                unoptimized
               sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
            </div>
          ) : (
            <video
              src={value}
              controls
              className="w-full h-32 object-contain bg-black rounded-xl"
            />
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg shadow-lg hover:bg-red-600 transition-colors"
            >
              ✕ Remove
            </button>
          </div>
          <p className="text-[10px] text-gray-400 truncate px-2 py-1">{value}</p>
        </div>
      )}

      {/* Drop zone / selector */}
      {!value && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            relative cursor-pointer rounded-xl border-2 border-dashed transition-all
            flex flex-col items-center justify-center gap-2 py-6 px-4
            ${isDragOver
              ? 'border-purple-500 bg-purple-50 scale-[1.01]'
              : 'border-slate-300 bg-slate-50 hover:border-purple-400 hover:bg-purple-50/40'
            }
            ${isUploading ? 'pointer-events-none' : ''}
          `}
        >
          {isUploading ? (
            <>
              <div className="w-full max-w-[160px] bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs font-semibold text-purple-600">{uploadProgress}% Uploading...</p>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                {accept === 'image' ? (
                  <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-gray-700">
                  Drop {accept === 'image' ? 'an image' : 'a video'} here or{' '}
                  <span className="text-purple-600 underline underline-offset-2">browse</span>
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {placeholder || (accept === 'image' ? 'JPG, PNG, WebP, AVIF or GIF · max 10 MB' : 'MP4, WebM or MOV · max 50 MB')}
                </p>
              </div>
            </>
          )}

          <input
            ref={inputRef}
            type="file"
            accept={acceptStr}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 font-medium">{error}</p>
      )}
    </div>
  );
}
