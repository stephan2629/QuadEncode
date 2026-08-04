'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0a0908] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-3xl font-bold font-serif mb-4 text-gray-100">Something went wrong!</h2>
      <p className="text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
        We ran into an unexpected error trying to load this page. We&apos;ve logged the issue and are looking into it.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
        <button
          onClick={() => reset()}
          className="flex items-center gap-2 bg-accent text-[#0a0908] font-bold px-6 py-3 rounded-xl hover:bg-accent/90 transition-colors active:scale-95"
        >
          <RotateCcw className="w-5 h-5" />
          Try again
        </button>
        <Link 
          href="/"
          className="px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors font-medium text-gray-300"
        >
          Go back home
        </Link>
      </div>
    </div>
  );
}
