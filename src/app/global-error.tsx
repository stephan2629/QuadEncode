'use client';

import { useEffect } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import './globals.css';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-[#0a0908] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-3xl font-bold font-serif mb-4 text-gray-100">Critical Error</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
            The application encountered a critical error. We have logged the issue and are looking into it.
          </p>
          <div className="flex flex-col gap-4 items-center justify-center">
            <button
              onClick={() => reset()}
              className="flex items-center gap-2 bg-accent text-[#0a0908] font-bold px-6 py-3 rounded-xl hover:bg-accent/90 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
              Reload Application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
