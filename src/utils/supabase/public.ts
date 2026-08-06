import { createClient } from '@supabase/supabase-js';

// A plain, cookie-free Supabase client for writes that don't need to know
// which user is making them (e.g. the indexed_subjects SEO bookkeeping in
// study/[query]/actions.ts). Deliberately not @/utils/supabase/server's
// createClient(): that one reads cookies() internally, and touching
// cookies() anywhere in a route's render path forces the whole route into
// fully dynamic rendering, which silently defeats `export const revalidate`
// (ISR) on the page that calls it - exactly what was breaking caching on
// /study/[query].
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
