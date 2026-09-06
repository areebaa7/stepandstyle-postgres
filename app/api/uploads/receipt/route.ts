import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { authRateLimitHeaders, consumeAuthRateLimit, getAuthClientAddress } from '@/lib/authRateLimit';
import { assertRequestSize, MAX_RECEIPT_BYTES, uploadSecurityResponse, validateUploadFile } from '@/lib/uploadSecurity';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export async function POST(request: NextRequest) {
  try {
    assertRequestSize(request, MAX_RECEIPT_BYTES + 256 * 1024);
    const address = getAuthClientAddress(request);
    const rateLimit = await consumeAuthRateLimit({ scope: 'upload-receipt', identifier: address, limit: 10, windowMs: 60 * 60 * 1000 });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, code: 'UPLOAD_RATE_LIMITED', error: 'Too many receipt uploads. Please try again later.' },
        { status: 429, headers: authRateLimitHeaders(rateLimit) }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Receipt image is required.' }, { status: 400 });
    }

    const validated = await validateUploadFile(file, { allowImages: true, allowVideos: false, imageMaxBytes: MAX_RECEIPT_BYTES, receipt: true });
    
    // Defensive buffer extraction to prevent any runtime body type mismatch
    const fileBuffer = (validated as any)?.buffer || validated;

    // Use Cloudinary upload stream
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'receipts' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      // We pass the buffer to the stream
      uploadStream.end(Buffer.from(fileBuffer));
    });

    const publicUrl = (uploadResult as any).secure_url;

    return NextResponse.json({ success: true, url: publicUrl }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    const securityResponse = uploadSecurityResponse(error);
    if (securityResponse) return securityResponse;
    console.error('Receipt upload failed with exception:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to upload receipt.' }, { status: 500 });
  }
}
