import { createBrowserClient } from '@supabase/ssr';

// Create a single instance of the Supabase client
export const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};

// Export a singleton instance
export const supabase = createClient(); 