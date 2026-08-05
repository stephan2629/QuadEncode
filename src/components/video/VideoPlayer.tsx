'use client';

import { useRef, useEffect, useState } from 'react';
import YouTube, { type YouTubePlayer } from 'react-youtube';
import { Clock, List, Loader2, ClipboardPlus } from 'lucide-react';
import { fetchVideoTranscript } from '@/app/notes/[id]/actions';
import { formatTimestamp } from '@/lib/parseBlanks';

interface VideoPlayerProps {
  videoId: string;
  seekToSeconds?: number;
  onCapture: (seconds: number) => void;
  onInsertTranscript?: (text: string, seconds: number) => void;
}

interface TranscriptLine {
  text: string;
  duration: number;
  offset: number;
  lang?: string;
}

// Transcript lines can carry inline HTML (rendered via dangerouslySetInnerHTML
// below) and HTML entities (&#39;, &amp;, ...). A plain tag-stripping regex
// leaves entities un-decoded in copied text, so route through the DOM
// instead - it strips tags and decodes entities in one pass.
function stripTranscriptHtml(html: string): string {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el.textContent ?? '';
}

export default function VideoPlayer({ videoId, seekToSeconds, onCapture, onInsertTranscript }: VideoPlayerProps) {
  const playerRef = useRef<YouTubePlayer | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);

  // Transcript State
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [loadingTranscript, setLoadingTranscript] = useState(true);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);

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

  // Fetch Transcript on Mount
  useEffect(() => {
    async function loadTranscript() {
      setLoadingTranscript(true);
      const res = await fetchVideoTranscript(videoId);
      if (res.success && res.data) {
        setTranscript(res.data as TranscriptLine[]);
      } else {
        setTranscriptError(res.error || 'Failed to load transcript.');
      }
      setLoadingTranscript(false);
    }
    loadTranscript();
  }, [videoId]);

  const handleCapture = async () => {
    if (!playerRef.current) return;
    const seconds = Math.floor(await playerRef.current.getCurrentTime());
    onCapture(seconds);
  };

  const handleSeekToOffset = (offsetMs: number) => {
    if (!playerRef.current) return;
    const seconds = offsetMs / 1000;
    playerRef.current.seekTo(seconds, true);
    playerRef.current.playVideo();
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0908] rounded-xl border border-white/5 overflow-hidden">
      {/* Top: Video Container */}
      <div ref={videoContainerRef} className="relative w-full aspect-video min-h-[320px] sm:min-h-[380px] lg:min-h-[440px] xl:min-h-[500px] shrink-0 bg-black shadow-2xl">
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
      
      {/* Middle: Transcript Header & Capture Button */}
      <div className="flex items-center justify-between p-2.5 border-b border-white/10 bg-[#14120f]/90 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-gray-300">
          <List className="w-3.5 h-3.5 text-accent" /> Transcript
        </div>
        
        <button
          onClick={handleCapture}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-accent to-amber-500 text-[#0a0908] rounded-xl text-xs font-bold transition-all shadow-[0_0_14px_rgba(245,158,11,0.3)] hover:brightness-110 active:scale-95 cursor-pointer"
          title="Capture Current Timestamp into Note"
        >
          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Capture Timestamp</span>
        </button>
      </div>

      {/* Bottom: Transcript Area */}
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-3 space-y-1">
          {loadingTranscript ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm gap-2 font-mono">
              <Loader2 className="w-5 h-5 animate-spin text-accent" />
              Loading transcript...
            </div>
          ) : transcriptError ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm px-6 text-center font-mono">
              <p>{transcriptError}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {transcript.map((line, i) => (
                <div
                  key={i}
                  className="flex items-start gap-1 p-1 hover:bg-accent/10 border border-transparent hover:border-accent/20 rounded-xl transition-all group"
                >
                  <button
                    onClick={() => handleSeekToOffset(line.offset)}
                    className="flex-1 flex gap-3 text-left p-1.5 min-w-0 cursor-pointer"
                    title="Jump to this moment in the video"
                  >
                    <span className="text-xs text-accent font-mono font-bold shrink-0 pt-0.5 group-hover:text-amber-300 transition-colors">
                      {formatTimestamp(Math.floor(line.offset / 1000))}
                    </span>
                    <span className="text-xs sm:text-sm text-gray-300 leading-relaxed font-light" dangerouslySetInnerHTML={{ __html: line.text }} />
                  </button>
                  {onInsertTranscript && (
                    <button
                      onClick={() => onInsertTranscript(stripTranscriptHtml(line.text), Math.floor(line.offset / 1000))}
                      className="shrink-0 w-11 h-11 lg:w-8 lg:h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-accent hover:bg-accent/10 focus-visible:opacity-100 transition-all cursor-pointer opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                      title="Copy this line into your note"
                    >
                      <ClipboardPlus className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
