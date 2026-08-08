import 'server-only'

import { createClient } from '@supabase/supabase-js'

// Only server-side path generation may write the shared public cache. Never
// expose this key through a NEXT_PUBLIC_ variable or import this module into a
// Client Component.
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing')

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
