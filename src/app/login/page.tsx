'use client';

import { useState } from 'react';
import { m } from "framer-motion";
import { login, signup } from './actions';
import { createClient } from '@/utils/supabase/client';
import { humanizeAuthError } from '@/lib/auth-errors';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

type Mode = 'login' | 'signup' | 'reset';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const isLogin = mode === 'login';
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    setNotice(null);

    if (mode === 'reset') {
      const email = formData.get('email') as string;
      const supabase = createClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/auth/callback?next=/auth/reset-password`,
      });
      setLoading(false);
      if (resetError) {
        setError(humanizeAuthError(resetError.message));
      } else {
        setNotice('Check your email for a reset link.');
      }
      return;
    }

    const action = isLogin ? login : signup;
    const res = await action(formData);

    // Reaching here means no redirect happened: either an error, or a signup
    // that needs email confirmation before there's a session to redirect with.
    if (res && 'error' in res && res.error) {
      setError(res.error);
      setLoading(false);
    } else if (res && 'notice' in res && res.notice) {
      setNotice(res.notice);
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) {
      setError(humanizeAuthError(oauthError.message));
      setGoogleLoading(false);
    }
    // On success, Supabase redirects the browser to Google; no further action here.
  }

  return (
    <div className="min-h-screen bg-[#0a0908] text-white flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-amber-600/10 blur-[100px] rounded-full pointer-events-none" />

      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        <Link href="/" className="flex items-center justify-center gap-2 text-white mb-10 hover:opacity-80 transition-opacity group">
          <div className="bg-accent/10 p-2 rounded-2xl border border-accent/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <Image src="/logo.png" alt="Quad Encode Logo" width={32} height={32} className="w-8 h-8" />
          </div>
          <span className="font-serif text-2xl font-bold tracking-tight text-white">Quad Encode</span>
        </Link>

        <div className="bg-[#14120f]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none"></div>
          
          <h2 className="text-2xl font-bold font-serif text-white mb-2 relative z-10">
            {mode === 'login' && 'Welcome back'}
            {mode === 'signup' && 'Create an account'}
            {mode === 'reset' && 'Reset your password'}
          </h2>
          <p className="text-gray-400 text-sm mb-8 relative z-10 font-light">
            {mode === 'login' && 'Enter your details to access your learning paths.'}
            {mode === 'signup' && 'Sign up to start organizing your knowledge.'}
            {mode === 'reset' && "Enter your email and we'll send you a reset link."}
          </p>

          <form action={handleSubmit} className="space-y-4 relative z-10">
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5" htmlFor="name">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Ada Lovelace"
                  required
                  className="w-full bg-[#1a1815] border border-white/10 rounded-xl px-4 py-3 text-base md:text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                className="w-full bg-[#1a1815] border border-white/10 rounded-xl px-4 py-3 text-base md:text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
              />
            </div>

            {mode !== 'reset' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#1a1815] border border-white/10 rounded-xl px-4 py-3 text-base md:text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                />
              </div>
            )}

            {isLogin && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => switchMode('reset')}
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {notice && (
              <div aria-live="polite" className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
                {notice}
              </div>
            )}

            {error && (
              <div
                role="alert"
                aria-live="polite"
                className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-muted text-[#14120f] font-bold py-3.5 px-4 rounded-xl transition-all shadow-[0_4px_14px_rgba(245,158,11,0.4)] hover:shadow-[0_6px_20px_rgba(245,158,11,0.6)] flex items-center justify-center mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              ) : (
                <>
                  {mode === 'login' && 'Sign in'}
                  {mode === 'signup' && 'Sign up'}
                  {mode === 'reset' && 'Send reset link'}
                </>
              )}
            </button>
          </form>

          {mode !== 'reset' && (
            <div className="flex items-center gap-3 my-6 relative z-10">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-gray-500 uppercase tracking-wider">Or</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
          )}

          {mode !== 'reset' && <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            aria-label={googleLoading ? 'Connecting to Google…' : undefined}
            className="relative z-10 w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-3.5 px-4 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                  <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.94H1.28v3.1C3.25 21.3 7.31 24 12 24z" />
                  <path fill="#FBBC05" d="M5.29 14.29A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.39-2.29v-3.1H1.28A11.98 11.98 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l4.01-3.1z" />
                  <path fill="#EA4335" d="M12 4.77c1.76 0 3.35.61 4.6 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.28 6.61l4.01 3.1C6.23 6.88 8.88 4.77 12 4.77z" />
                </svg>
                Continue with Google
              </>
            )}
          </button>}

          <div className="mt-6 text-center relative z-10">
            <button
              type="button"
              onClick={() => switchMode(isLogin ? 'signup' : 'login')}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </m.div>
    </div>
  );
}
