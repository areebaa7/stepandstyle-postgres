import { NextRequest, NextResponse } from 'next/server';
import type { UploadApiResponse } from 'cloudinary';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});
import { verifyAdminRequest } from '@/lib/auth';
import { assertRequestSize, MAX_ADMIN_IMAGE_BYTES, uploadSecurityResponse, validateUploadFile } from '@/lib/uploadSecurity';

export async function POST(request: NextRequest) {
  if (!await verifyAdminRequest(request)) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  try {
    assertRequestSize(request, MAX_ADMIN_IMAGE_BYTES + 256 * 1024);
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Image is required.' }, { status: 400 });
    const validated = await validateUploadFile(file, { allowImages: true, allowVideos: false });
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'step-and-style/blogs', resource_type: 'image', use_filename: false, unique_filename: true, overwrite: false },
        (error: any, upload: any) => error || !upload ? reject(error || new Error('Cloudinary returned no result.')) : resolve(upload),
      );
      stream.end(validated.buffer);
    });
    if (!result.secure_url?.startsWith('https://')) throw new Error('Cloudinary returned an insecure URL.');
    return NextResponse.json({ success: true, url: result.secure_url, filename: result.public_id }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const securityResponse = uploadSecurityResponse(error);
    if (securityResponse) return securityResponse;
    console.error('Blog image upload failed:', error);
    return NextResponse.json({ error: 'Failed to upload image.' }, { status: 500 });
  }
}
