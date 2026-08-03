'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { login, signup } from './actions';
import { BrainCircuit, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const action = isLogin ? login : signup;
    const res = await action(formData);
    
    // If we reach here, it means there was an error (successful login redirects)
    if (res?.error) {
      setError(res.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-accent/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Link href="/" className="flex items-center justify-center gap-2 text-white mb-10 hover:opacity-80 transition-opacity">
          <div className="bg-accent/20 p-2 rounded-xl text-accent border border-accent/20">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <span className="font-serif text-2xl font-bold tracking-tight">Quad Encode</span>
        </Link>

        <div className="bg-[#14120f]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none"></div>
          
          <h2 className="text-2xl font-bold text-white mb-2 relative z-10">
            {isLogin ? 'Welcome back' : 'Create an account'}
          </h2>
          <p className="text-gray-400 text-sm mb-8 relative z-10">
            {isLogin 
              ? 'Enter your details to access your learning paths.' 
              : 'Sign up to start organizing your knowledge.'}
          </p>

          <form action={handleSubmit} className="space-y-4 relative z-10">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                className="w-full bg-[#1a1815] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                className="w-full bg-[#1a1815] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-muted text-[#14120f] font-bold py-3.5 px-4 rounded-xl transition-all shadow-[0_4px_14px_rgba(245,158,11,0.4)] hover:shadow-[0_6px_20px_rgba(245,158,11,0.6)] flex items-center justify-center mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                isLogin ? 'Sign In' : 'Sign Up'
              )}
            </button>
          </form>

          <div className="mt-6 text-center relative z-10">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              {isLogin 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
