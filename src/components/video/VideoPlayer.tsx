'use client';

import { useRef, useEffect } from 'react';
import YouTube, { type YouTubePlayer } from 'react-youtube';
import { Clock } from 'lucide-react';

interface VideoPlayerProps {
  videoId: string;
  seekToSeconds?: number;
  onCapture: (seconds: number) => void;
}

export default function VideoPlayer({ videoId, seekToSeconds, onCapture }: VideoPlayerProps) {
  const playerRef = useRef<YouTubePlayer | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);

  // Seeks whenever a new target arrives
  useEffect(() => {
    if (seekToSeconds != null) playerRef.current?.seekTo(seekToSeconds, true);
  }, [seekToSeconds]);

  // The YouTube IFrame API sizes its internal iframe once on load and never
  // repaints it on CSS-driven container resize (e.g. dragging the browser
  // window) - audio keeps playing but the frame freezes until something else
  // forces a reflow. Explicitly re-sizing the player on container resize is
  // the documented fix (player.setSize()).
  useEffect(() => {
    const container = videoContainerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      playerRef.current?.setSize(width, height);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const handleCapture = async () => {
    if (!playerRef.current) return;
    const seconds = Math.floor(await playerRef.current.getCurrentTime());
    onCapture(seconds);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0908] rounded-xl border border-white/5 overflow-hidden">
      {/* Video fills the panel - this used to share the column with a
          transcript list below it (removed: YouTube suppresses caption
          data for requests from Netlify's serverless IPs often enough that
          the feature was unreliable, see docs/decisions/0003). */}
      <div ref={videoContainerRef} className="relative w-full flex-1 min-h-[320px] bg-black shadow-2xl">
        <YouTube
          videoId={videoId}
          opts={{
            width: '100%',
            height: '100%',
            playerVars: {
              origin: typeof window !== 'undefined' ? window.location.origin : ''
            }
          }}
          className="absolute inset-0 w-full h-full"
          iframeClassName="absolute inset-0 w-full h-full"
          onReady={(e) => { playerRef.current = e.target; }}
        />
      </div>

      <div className="flex items-center justify-end p-2.5 border-t border-white/10 bg-[#14120f]/90 backdrop-blur-md shrink-0">
        <button
          onClick={handleCapture}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-accent to-amber-500 text-[#0a0908] rounded-xl text-xs font-bold transition-all shadow-[0_0_14px_rgba(245,158,11,0.3)] hover:brightness-110 active:scale-95 cursor-pointer"
          title="Capture Current Timestamp into Note"
        >
          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Capture Timestamp</span>
        </button>
      </div>
    </div>
  );
}
