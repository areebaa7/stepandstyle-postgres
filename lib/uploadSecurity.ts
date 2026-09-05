const IMAGE_TYPES = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/gif': ['gif'],
  'image/webp': ['webp'],
  'image/avif': ['avif'],
} as const;

const VIDEO_TYPES = {
  'video/mp4': ['mp4', 'm4v'],
  'video/webm': ['webm'],
  'video/quicktime': ['mov'],
} as const;

export const MAX_ADMIN_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_ADMIN_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_ADMIN_BATCH_BYTES = 75 * 1024 * 1024;
export const MAX_ADMIN_FILES = 10;
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

export class UploadSecurityError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
    this.name = 'UploadSecurityError';
  }
}

function startsWith(buffer: Buffer, signature: number[]) {
  return signature.every((value, index) => buffer[index] === value);
}

function detectMime(buffer: Buffer) {
  if (buffer.length >= 3 && startsWith(buffer, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (buffer.length >= 8 && startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  const header = buffer.subarray(0, 16).toString('ascii');
  if (header.startsWith('GIF87a') || header.startsWith('GIF89a')) return 'image/gif';
  if (header.startsWith('RIFF') && header.slice(8, 12) === 'WEBP') return 'image/webp';
  if (startsWith(buffer, [0x1a, 0x45, 0xdf, 0xa3])) return 'video/webm';
  if (buffer.length >= 12 && header.slice(4, 8) === 'ftyp') {
    const brand = header.slice(8, 12);
    if (brand === 'avif' || brand === 'avis') return 'image/avif';
    if (brand === 'qt  ') return 'video/quicktime';
    return 'video/mp4';
  }
  return null;
}

export function assertRequestSize(request: Request, maxBytes: number) {
  const rawLength = request.headers.get('content-length');
  if (!rawLength) return;
  const length = Number(rawLength);
  if (!Number.isSafeInteger(length) || length < 0) {
    throw new UploadSecurityError('INVALID_CONTENT_LENGTH', 'Invalid upload size header.', 400);
  }
  if (length > maxBytes) {
    throw new UploadSecurityError('UPLOAD_TOO_LARGE', 'Upload request exceeds the allowed size.', 413);
  }
}

export async function validateUploadFile(file: File, options: {
  allowImages: boolean;
  allowVideos: boolean;
  imageMaxBytes?: number;
  videoMaxBytes?: number;
  receipt?: boolean;
}) {
  if (!file.name || file.name.length > 180 || /[\0-\x1f\x7f]/.test(file.name)) {
    throw new UploadSecurityError('INVALID_FILENAME', 'The selected file name is invalid.');
  }
  if (file.size < 1) throw new UploadSecurityError('EMPTY_FILE', 'Empty files are not allowed.');

  const imageExtensions = IMAGE_TYPES[file.type as keyof typeof IMAGE_TYPES];
  const videoExtensions = VIDEO_TYPES[file.type as keyof typeof VIDEO_TYPES];
  const resourceType = imageExtensions ? 'image' : videoExtensions ? 'video' : null;
  if (!resourceType || (resourceType === 'image' && !options.allowImages) || (resourceType === 'video' && !options.allowVideos)) {
    throw new UploadSecurityError('UNSUPPORTED_FILE_TYPE', 'This file type is not allowed.', 415);
  }
  if (options.receipt && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new UploadSecurityError('UNSUPPORTED_RECEIPT_TYPE', 'Receipts must be JPG, PNG, or WebP images.', 415);
  }

  const maxBytes = resourceType === 'image'
    ? options.imageMaxBytes ?? MAX_ADMIN_IMAGE_BYTES
    : options.videoMaxBytes ?? MAX_ADMIN_VIDEO_BYTES;
  if (file.size > maxBytes) {
    throw new UploadSecurityError('FILE_TOO_LARGE', `${resourceType === 'image' ? 'Image' : 'Video'} exceeds the ${Math.round(maxBytes / 1024 / 1024)} MB limit.`, 413);
  }

  const extension = file.name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || '';
  const allowedExtensions = imageExtensions || videoExtensions || [];
  if (!allowedExtensions.includes(extension as never)) {
    throw new UploadSecurityError('INVALID_FILE_EXTENSION', 'The file extension does not match an allowed format.', 415);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedMime = detectMime(buffer);
  if (detectedMime !== file.type) {
    throw new UploadSecurityError('FILE_SIGNATURE_MISMATCH', 'The file content does not match its declared type.', 415);
  }

  return { buffer, resourceType, mimeType: detectedMime } as const;
}

export function uploadSecurityResponse(error: unknown) {
  if (!(error instanceof UploadSecurityError)) return null;
  return Response.json(
    { success: false, code: error.code, error: error.message },
    { status: error.status, headers: { 'Cache-Control': 'no-store' } },
  );
}

export function isTrustedReceiptUrl(value: string) {
  try {
    const url = new URL(value);
    
    // Check Supabase 'step-and-styl-uploads' or 'receipts'
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://msabiymjxqvdpxeddxbe.supabase.co';
    if (value.startsWith(supabaseUrl + '/storage/v1/object/public/')) {
      return true;
    }
    
    // Check legacy Cloudinary
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
    if (cloudName && url.protocol === 'https:' && url.hostname === 'res.cloudinary.com') {
      const prefix = `/${cloudName}/image/upload/`;
      return url.pathname.startsWith(prefix) && (url.pathname.includes('/receipts/') || url.pathname.includes('/step-and-style/'));
    }
    
    return false;
  } catch {
    return false;
  }
}