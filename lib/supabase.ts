import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://msabiymjxqvdpxeddxbe.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';

if (supabaseUrl === 'https://msabiymjxqvdpxeddxbe.supabase.co' || supabaseKey === 'sb_publishable_Q5C_SSnDN-cY6MoacYw7kg_zw9KVfEZ') {
  console.warn('Supabase URL or Key is missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
