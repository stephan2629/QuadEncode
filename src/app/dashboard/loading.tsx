import ReactDOM from 'react-dom';
import { Loader2 } from 'lucide-react';

// Next's default deviceSizes (no `images` override in next.config.ts). The
// banner is a `fill` image with no `sizes`, so it behaves as 100vw and the
// browser picks a width from this set.
const DEVICE_WIDTHS = [640, 750, 828, 1080, 1200, 1920, 2048, 3840];
const bannerUrl = (w: number) =>
  `/_next/image?url=${encodeURIComponent('/dashboard-banner.png')}&w=${w}&q=75`;

export default function DashboardLoading() {
  // The banner image is this route's LCP element, and `priority` on the
  // <Image> in DashboardHeroBanner is not enough on its own: the preload
  // tag that `priority` emits lives in page.tsx's HTML, and page.tsx awaits
  // several Supabase queries before any of it is sent. This skeleton is the
  // only thing that ships at TTFB, so preloading here is what actually
  // closes the gap - measured at 1411ms of LCP "load delay" before this,
  // with the image itself taking 0.8ms to download once requested.
  //
  // Passing the full srcset rather than one width so the browser resolves
  // exactly the candidate it would have chosen from the real <Image>; a
  // single hardcoded width would risk preloading one file and then fetching
  // a different one.
  ReactDOM.preload(bannerUrl(1920), {
    as: 'image',
    fetchPriority: 'high',
    imageSrcSet: DEVICE_WIDTHS.map((w) => `${bannerUrl(w)} ${w}w`).join(', '),
    imageSizes: '100vw',
  });

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
