import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  // Only the routes updateSession() actually branches on (see
  // src/utils/supabase/middleware.ts). Public pages like /study/[query]
  // must never hit this - calling supabase.auth.getUser() there writes a
  // Set-Cookie header on every request, which makes Netlify's CDN skip its
  // ISR cache and re-run the full path-generation pipeline for every visitor.
  matcher: [
    '/dashboard/:path*',
    '/notes/:path*',
    '/review/:path*',
    '/practice/:path*',
    '/imports/:path*',
    '/settings/:path*',
    '/login',
  ],
}
