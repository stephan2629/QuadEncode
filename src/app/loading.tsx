import { Loader2 } from 'lucide-react';

export default function GlobalLoading() {
  return (
    <div className="min-h-dvh w-full bg-[#0a0908] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full animate-pulse" />
        <Loader2 className="w-10 h-10 text-accent animate-spin relative z-10" />
      </div>
      <h3 className="text-xl font-serif font-bold text-gray-200 mb-2">Loading Quad Encode</h3>
      <p className="text-xs text-gray-400 font-light max-w-xs font-mono">
        Preparing workspace...
      </p>
    </div>
  );
}
