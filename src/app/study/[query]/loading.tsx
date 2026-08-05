import { Loader2, Sparkles } from 'lucide-react';

export default function StudyLoading() {
  return (
    <div className="min-h-dvh bg-[#0a0908] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full animate-pulse" />
        <Loader2 className="w-12 h-12 text-accent animate-spin relative z-10" />
      </div>
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-mono font-bold uppercase tracking-wider mb-4">
        <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Curating Learning Path
      </div>
      <h2 className="text-2xl md:text-3xl font-serif font-bold mb-3 text-white">
        Analyzing Web & Video Resources...
      </h2>
      <p className="text-gray-400 max-w-md mx-auto text-xs md:text-sm font-light leading-relaxed">
        Fetching top-rated video courses and documentation to curate your active recall path. This takes about 5 seconds on serverless.
      </p>
    </div>
  );
}
