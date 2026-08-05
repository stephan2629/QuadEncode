'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { humanizeAuthError } from '@/lib/auth-errors';
import { Loader2, Eye, EyeOff, CheckCircle2, Lock } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify both fields.');
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(humanizeAuthError(updateError.message));
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    setTimeout(() => {
      router.push('/dashboard');
    }, 2000);
  }

  return (
    <div className="min-h-screen bg-[#0a0908] text-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-accent/10 blur-[130px] rounded-full pointer-events-none -z-10" />

      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Brand Header */}
        <Link href="/" className="flex items-center justify-center gap-2.5 text-white mb-8 hover:opacity-80 transition-opacity">
          <div className="bg-accent/10 p-2 rounded-2xl border border-accent/30 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <Image src="/logo.png" alt="Quad Encode Logo" width={32} height={32} className="w-8 h-8 object-contain" />
          </div>
          <span className="font-serif text-2xl font-bold tracking-tight">Quad Encode</span>
        </Link>

        {/* Card Container */}
        <div className="bg-[#14120f]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative">
          {success ? (
            <m.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6 space-y-4"
            >
              <div className="w-14 h-14 bg-green-500/10 border border-green-500/30 rounded-2xl flex items-center justify-center mx-auto text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold font-serif text-white">Password Updated!</h2>
              <p className="text-sm text-gray-400 font-light max-w-xs mx-auto">
                Your new password has been saved. Redirecting to your dashboard...
              </p>
              <div className="pt-4 flex items-center justify-center gap-2 text-xs font-mono text-accent">
                <Loader2 className="w-4 h-4 animate-spin" /> Navigating to dashboard...
              </div>
            </m.div>
          ) : (
            <>
              <div className="mb-6 text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-mono font-bold uppercase tracking-wider mb-3">
                  <Lock className="w-3.5 h-3.5" /> Security Reset
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold font-serif text-white tracking-tight">Set your new password</h1>
                <p className="text-gray-400 text-xs sm:text-sm mt-1.5 font-light leading-relaxed">
                  Enter your new password below to secure your account.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 text-left">
                {/* New Password */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-400 mb-1.5" htmlFor="new-password">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#0a0908] border border-white/10 rounded-xl px-4 py-3.5 pr-12 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors p-1"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-400 mb-1.5" htmlFor="confirm-password">
                    Confirm New Password
                  </label>
                  <input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Re-enter new password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#0a0908] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all font-sans"
                  />
                </div>

                {/* Error Banner */}
                {error && (
                  <m.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    role="alert"
                    aria-live="polite"
                    className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium"
                  >
                    {error}
                  </m.div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-accent to-amber-500 hover:brightness-110 text-[#0a0908] font-bold py-3.5 px-4 rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed text-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      Updating password...
                    </>
                  ) : (
                    'Save New Password'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </m.div>
    </div>
  );
}
