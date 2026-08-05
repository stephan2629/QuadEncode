'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { humanizeAuthError } from '@/lib/auth-errors'

// NEXT_PUBLIC_SITE_URL is a build-time constant baked to the production
// domain (netlify.toml), identical on every branch-preview and local build.
// The PKCE code_verifier a confirmation/reset link needs is a cookie scoped
// to whatever origin actually sent the request, so the email link has to
// redirect back to that same origin or the code exchange silently fails.
// Reconstruct it from the request instead of trusting the env var.
async function siteOrigin(): Promise<string> {
  const h = await headers()
  const origin = h.get('origin')
  if (origin) return origin
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'https'
  return host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
}

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: humanizeAuthError(error.message) }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const siteUrl = await siteOrigin()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  })

  if (error) {
    return { error: humanizeAuthError(error.message) }
  }

  // With email confirmation on, signUp returns no session: the account exists
  // but stays unusable until the link is clicked. Redirecting to /dashboard
  // here would just bounce off the middleware back to /login with nothing
  // explaining why, so say what happened instead.
  if (!data.session) {
    return { notice: 'Account created. Check your email for the confirmation link.' }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

export async function deleteAccount() {
  const supabase = await createClient()

  const { error } = await supabase.rpc('delete_own_account')
  if (error) {
    console.error('Error deleting account:', error)
    return
  }

  await supabase.auth.signOut()
  redirect('/')
}
