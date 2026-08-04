'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { m } from "framer-motion";
import { createClient } from '@/utils/supabase/client';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center justify-center gap-2 text-white mb-10">
          <div className="bg-accent/10 p-1.5 rounded-xl border border-accent/20 flex items-center justify-center">
            <Image src="/logo.png" alt="Quad Encode Logo" width={32} height={32} className="w-8 h-8" />
          </div>
          <span className="font-serif text-2xl font-bold tracking-tight">Quad Encode</span>
        </div>

        <div className="bg-[#14120f]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl">
          <h1 className="text-2xl font-bold text-white mb-2">Set a new password</h1>
          <p className="text-gray-400 text-sm mb-8">
            Enter the password you want to use from now on.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5" htmlFor="new-password">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#1a1815] border border-white/10 rounded-xl px-4 py-3 text-base md:text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
              />
            </div>

            {error && (
              <div role="alert" aria-live="polite" className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-muted text-[#14120f] font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : 'Save New Password'}
            </button>
          </form>
        </div>
      </m.div>
    </div>
  );
}
