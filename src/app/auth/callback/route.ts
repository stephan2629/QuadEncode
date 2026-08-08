import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Only allow internal paths as redirect targets.
  const next = searchParams.get('next')
  const target = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'

  if (code) {
    // Build the redirect response first, then attach a Supabase client whose
    // setAll handler writes cookies directly onto that response object.
    // Using createServerClient here instead of the shared server.ts helper
    // because cookies() from next/headers writes to the implicit response —
    // but this handler returns an explicit NextResponse.redirect, which is a
    // different object. Any cookies set via cookieStore.set() are silently
    // dropped, so the session cookie never reaches the browser and middleware
    // sees an unauthenticated request on the very next navigation, bouncing
    // the user back to /login (the "two-login" bug).
    const redirectResponse = NextResponse.redirect(`${origin}${target}`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              redirectResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return redirectResponse
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
