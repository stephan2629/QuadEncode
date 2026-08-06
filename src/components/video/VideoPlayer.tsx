'use client';

import { useRef, useEffect, useState } from 'react';
import YouTube, { type YouTubePlayer } from 'react-youtube';
import { Clock, Play } from 'lucide-react';
import { useSessionStorage } from '@/hooks/useSessionStorage';

interface VideoPlayerProps {
  videoId: string;
  seekToSeconds?: number;
  onCapture: (seconds: number) => void;
}

// Playback position is per-video, browser-local convenience state, not app
// data - sessionStorage is enough, and it already survives a refresh or a
// sign-out within the same tab, which is what was actually asked for.
const YT_STATE_PLAYING = 1;

export default function VideoPlayer({ videoId, seekToSeconds, onCapture }: VideoPlayerProps) {
  const playerRef = useRef<YouTubePlayer | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const positionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [savedPosition, setSavedPosition] = useSessionStorage(`video-${videoId}-position`, 0);

  // react-youtube mounts the real iframe (and YouTube's own low-res poster
  // frame) immediately on render. That poster is native ~480x360 and this
  // container runs much wider on desktop split-view, so it renders visibly
  // blurry until the player finishes loading. Gate the iframe behind a
  // click on a real hqdefault/maxresdefault thumbnail instead - crisp at
  // this size, and defers the YouTube JS until the user actually wants it.
  const [started, setStarted] = useState(false);

  // Starts the player the moment a seek target arrives (e.g. clicking a
  // captured timestamp link elsewhere in the note), even before the facade
  // has been clicked. Adjusted during render rather than in an effect - see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevSeekToSeconds, setPrevSeekToSeconds] = useState(seekToSeconds);
  if (prevSeekToSeconds !== seekToSeconds) {
    setPrevSeekToSeconds(seekToSeconds);
    if (seekToSeconds != null && !started) {
      setStarted(true);
    }
  }

  // Seeks the already-mounted player whenever a new target arrives. On first
  // mount this is a no-op (onReady handles the initial seek once the player
  // exists); it only does work for a target that changes after that.
  useEffect(() => {
    if (seekToSeconds != null) {
      playerRef.current?.seekTo(seekToSeconds, true);
    }
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

  useEffect(() => {
    return () => {
      if (positionIntervalRef.current) clearInterval(positionIntervalRef.current);
    };
  }, []);

  const persistPosition = async () => {
    if (!playerRef.current) return;
    const seconds = await playerRef.current.getCurrentTime();
    setSavedPosition(Math.floor(seconds));
  };

  const handleStateChange = (e: { data: number }) => {
    if (e.data === YT_STATE_PLAYING) {
      if (positionIntervalRef.current) clearInterval(positionIntervalRef.current);
      positionIntervalRef.current = setInterval(persistPosition, 5000);
    } else {
      if (positionIntervalRef.current) clearInterval(positionIntervalRef.current);
      persistPosition();
    }
  };

  const handleCapture = async () => {
    if (!playerRef.current) return;
    const seconds = Math.floor(await playerRef.current.getCurrentTime());
    onCapture(seconds);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0908] rounded-xl border border-white/5 overflow-hidden">
      <div ref={videoContainerRef} className="relative w-full flex-1 min-h-[320px] bg-black shadow-2xl">
        {started ? (
          <YouTube
            videoId={videoId}
            opts={{
              width: '100%',
              height: '100%',
              playerVars: {
                autoplay: 1,
                origin: typeof window !== 'undefined' ? window.location.origin : ''
              }
            }}
            className="absolute inset-0 w-full h-full"
            iframeClassName="absolute inset-0 w-full h-full"
            onReady={(e) => {
              playerRef.current = e.target;
              // Only resume if nothing else (e.g. a clicked timestamp link)
              // already asked for a specific position. savedPosition comes
              // from sessionStorage via a post-mount effect in
              // useSessionStorage - in practice that resolves well before the
              // iframe finishes loading, but a very fast local cache could in
              // theory race it and resume from 0 once. Not worth a loading
              // gate for that edge case.
              if (seekToSeconds != null) {
                e.target.seekTo(seekToSeconds, true);
              } else if (savedPosition > 5) {
                e.target.seekTo(savedPosition, true);
              }
            }}
            onStateChange={handleStateChange}
          />
        ) : (
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="group absolute inset-0 w-full h-full cursor-pointer"
            aria-label="Play video"
          >
            {/* object-contain, not object-cover: this facade's container
                runs far taller than the thumbnail's native 16:9 (60% width,
                full panel height in the split-view layout), and cover would
                crop the thumbnail's own title text off both edges to fill
                that box. Letterboxing against the container's existing
                bg-black loses nothing instead. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- YouTube
                thumbnail CDN, not a Next-optimizable local/remote asset worth
                configuring image domains for one call site */}
            <img
              src={`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`}
              onError={(e) => { e.currentTarget.src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`; }}
              alt=""
              className="absolute inset-0 w-full h-full object-contain"
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform">
                <Play className="w-7 h-7 text-black ml-1" fill="currentColor" aria-hidden="true" />
              </div>
            </div>
          </button>
        )}
      </div>

      <div className="flex items-center justify-end p-2.5 border-t border-white/10 bg-[#14120f]/90 backdrop-blur-md shrink-0">
        <button
          onClick={handleCapture}
          disabled={!started}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-accent to-amber-500 text-[#0a0908] rounded-xl text-xs font-bold transition-all shadow-[0_0_14px_rgba(245,158,11,0.3)] hover:brightness-110 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
          title="Capture Current Timestamp into Note"
        >
          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Capture Timestamp</span>
        </button>
      </div>
    </div>
  );
}
