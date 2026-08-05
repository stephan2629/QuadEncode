import { Loader2, Brain } from 'lucide-react';

export default function ReviewLoading() {
  return (
    <div className="min-h-dvh bg-[#0a0908] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full animate-pulse" />
        <Loader2 className="w-10 h-10 text-accent animate-spin relative z-10" />
      </div>
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-mono font-bold mb-3">
        <Brain className="w-4 h-4" /> Spaced Repetition Engine
      </div>
      <h3 className="text-xl font-serif font-bold text-gray-200 mb-2">Preparing Review Cards</h3>
      <p className="text-xs text-gray-400 font-light max-w-xs font-mono">
        Sorting memory boxes & due items...
      </p>
    </div>
  );
}
