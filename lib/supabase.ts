// Drop-in replacement for lib/supabase.ts using native fetch (Zero external dependencies)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://msabiymjxqvdpxeddxbe.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';

if (supabaseUrl === 'https://msabiymjxqvdpxeddxbe.supabase.co' || supabaseKey === 'sb_publishable_Q5C_SSnDN-cY6MoacYw7kg_zw9KVfEZ') {
  console.warn('Supabase URL or Key is missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
}

export const supabase = {
  storage: {
    from(bucket: string) {
      return {
        async upload(path: string, fileBody: any, options?: { contentType?: string; upsert?: boolean }) {
          try {
            const res = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'apikey': supabaseKey,
                'Content-Type': options?.contentType || 'image/png',
                'x-upsert': options?.upsert ? 'true' : 'false'
              },
              body: fileBody
            });

            if (!res.ok) {
              const errText = await res.text();
              return { data: null, error: { message: errText || res.statusText } };
            }

            return { data: { path }, error: null };
          } catch (err: any) {
            return { data: null, error: { message: err.message || 'Upload failed' } };
          }
        },
        getPublicUrl(path: string) {
          return {
            data: { publicUrl: `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}` }
          };
        }
      };
    }
  }
};