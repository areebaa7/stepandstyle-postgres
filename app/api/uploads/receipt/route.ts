import { NextRequest, NextResponse } from 'next/server';
import { authRateLimitHeaders, consumeAuthRateLimit, getAuthClientAddress } from '@/lib/authRateLimit';
import { assertRequestSize, MAX_RECEIPT_BYTES, uploadSecurityResponse, validateUploadFile } from '@/lib/uploadSecurity';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://msabiymjxqvdpxeddxbe.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_Q5C_SSnDN-cY6MoacYw7kg_zw9KVfEZ';

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
    
    const ext = file.name.split('.').pop() || 'png';
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const fileName = `${timestamp}-${randomString}.${ext}`;
    const targetBucket = 'step-and-styl-uploads';

    // Upload directly using standard fetch (No npm package required)
    const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/${targetBucket}/${fileName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': file.type || 'image/png',
        'x-upsert': 'true'
      },
      body: validated.buffer
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error('Supabase REST upload error:', errText);
      return NextResponse.json({ success: false, error: `Supabase Storage Error: ${uploadRes.statusText}` }, { status: 500 });
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${targetBucket}/${fileName}`;

    return NextResponse.json({ success: true, url: publicUrl }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    const securityResponse = uploadSecurityResponse(error);
    if (securityResponse) return securityResponse;
    console.error('Receipt upload failed with exception:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to upload receipt.' }, { status: 500 });
  }
}