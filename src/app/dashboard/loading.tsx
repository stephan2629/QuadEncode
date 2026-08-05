import { Loader2 } from 'lucide-react';

export default function DashboardLoading() {
  return (
    <div className="h-dvh w-full bg-[#0a0908] text-white flex flex-col p-6 max-w-6xl mx-auto custom-scrollbar">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center mb-10 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/20 animate-pulse" />
          <div className="w-32 h-6 rounded-md bg-white/10 animate-pulse" />
        </div>
        <div className="w-24 h-8 rounded-full bg-white/5 animate-pulse" />
      </div>

      {/* Hero Banner Skeleton */}
      <div className="w-full rounded-3xl bg-[#14120f] border border-white/10 p-8 mb-10 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
        <div className="space-y-3 w-full max-w-md">
          <div className="w-36 h-5 rounded-full bg-accent/20 animate-pulse" />
          <div className="w-64 h-8 rounded-lg bg-white/10 animate-pulse" />
          <div className="w-80 h-4 rounded-md bg-white/5 animate-pulse" />
        </div>
        <div className="w-48 h-14 rounded-2xl bg-accent/30 animate-pulse flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 text-accent animate-spin" />
          <span className="text-xs font-mono font-bold text-accent">Loading...</span>
        </div>
      </div>

      {/* Learning Paths Skeleton Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-6 rounded-3xl bg-[#14120f] border border-white/10 h-52 flex flex-col justify-between animate-pulse">
            <div className="space-y-3">
              <div className="w-20 h-4 rounded bg-accent/20" />
              <div className="w-40 h-6 rounded bg-white/10" />
            </div>
            <div className="w-full h-2 rounded-full bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
