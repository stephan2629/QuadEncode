import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Only allow internal paths as redirect targets.
  const next = searchParams.get('next')
  const target = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${target}`)
    }
  }

  // Recovery links are commonly opened in a different browser/app than the
  // one that requested them, which fails PKCE code exchange silently.
  // Tell the user what happened instead of bouncing to a blank login form.
  if (target === '/auth/reset-password') {
    return NextResponse.redirect(`${origin}/login?error=reset_link_invalid`)
  }

  return NextResponse.redirect(`${origin}/login`)
}
