import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  
  if (session) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  } else if (process.env.NODE_ENV === 'development' && document.cookie.includes('dev_bypass=true')) {
    headers['X-Dev-Bypass'] = 'true';
  }
  
  return headers;
}

export async function checkAuth(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session || (process.env.NODE_ENV === 'development' && document.cookie.includes('dev_bypass=true'));
} 