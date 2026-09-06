import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { verifyAdminRequest } from '@/lib/auth';
import { authRateLimitHeaders, consumeAuthRateLimit, getAuthClientAddress } from '@/lib/authRateLimit';
import {
  assertRequestSize,
  MAX_ADMIN_BATCH_BYTES,
  MAX_ADMIN_FILES,
  uploadSecurityResponse,
  validateUploadFile,
} from '@/lib/uploadSecurity';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export async function POST(request: NextRequest) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return NextResponse.json({ success: false, error: 'Admin access required.' }, { status: 403 });

  try {
    assertRequestSize(request, MAX_ADMIN_BATCH_BYTES + 1024 * 1024);
    const rateLimit = await consumeAuthRateLimit({
      scope: 'upload-admin',
      identifier: `${admin.userId}:${getAuthClientAddress(request)}`,
      limit: 120,
      windowMs: 60 * 60 * 1000,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, code: 'UPLOAD_RATE_LIMITED', error: 'Too many uploads. Please try again later.' },
        { status: 429, headers: authRateLimitHeaders(rateLimit) },
      );
    }

    const formData = await request.formData();
    const entries = formData.getAll('files');
    if (entries.length === 0) return NextResponse.json({ success: false, error: 'No files provided.' }, { status: 400 });
    if (entries.length > MAX_ADMIN_FILES) {
      return NextResponse.json({ success: false, code: 'TOO_MANY_FILES', error: `Upload at most ${MAX_ADMIN_FILES} files at once.` }, { status: 400 });
    }
    if (entries.some((entry) => !(entry instanceof File))) {
      return NextResponse.json({ success: false, code: 'INVALID_FILE', error: 'Every upload entry must be a file.' }, { status: 400 });
    }

    const files = entries as File[];
    if (files.reduce((total, file) => total + file.size, 0) > MAX_ADMIN_BATCH_BYTES) {
      return NextResponse.json({ success: false, code: 'UPLOAD_TOO_LARGE', error: 'Combined upload size exceeds 75 MB.' }, { status: 413 });
    }

    const validated = await Promise.all(files.map((file) => validateUploadFile(file, { allowImages: true, allowVideos: true })));
    const urls: string[] = [];

    for (let i = 0; i < validated.length; i++) {
      const item = validated[i];
      const originalFile = files[i];

      const isVideo = originalFile.type.startsWith('video/');

      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'media', resource_type: isVideo ? 'video' : 'image' },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        uploadStream.end(Buffer.from(item.buffer));
      });

      const publicUrl = (uploadResult as any).secure_url;
      urls.push(publicUrl);
    }

    return NextResponse.json({ success: true, urls }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    const securityResponse = uploadSecurityResponse(error);
    if (securityResponse) return securityResponse;
    console.error('Admin upload failed:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to upload files.' }, { status: 500 });
  }
}
