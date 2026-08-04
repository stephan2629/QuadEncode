'use client';

import { useRef, useEffect, useState } from 'react';
import YouTube, { type YouTubePlayer } from 'react-youtube';
import { Clock, MessageSquare, List, Loader2, Send } from 'lucide-react';
import { fetchVideoTranscript, chatWithVideo } from '@/app/notes/[id]/actions';
import { formatTimestamp } from '@/lib/parseBlanks';

interface VideoPlayerProps {
  videoId: string;
  seekToSeconds?: number;
  onCapture: (seconds: number) => void;
}

interface TranscriptLine {
  text: string;
  duration: number;
  offset: number;
  lang?: string;
}

type Tab = 'transcript' | 'chat';

export default function VideoPlayer({ videoId, seekToSeconds, onCapture }: VideoPlayerProps) {
  const playerRef = useRef<YouTubePlayer | null>(null);
  
  const [activeTab, setActiveTab] = useState<Tab>('transcript');
  
  // Transcript State
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [loadingTranscript, setLoadingTranscript] = useState(true);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  
  // Chat State
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [isChatting, setIsChatting] = useState(false);

  // Seeks whenever a new target arrives
  useEffect(() => {
    if (seekToSeconds != null) playerRef.current?.seekTo(seekToSeconds, true);
  }, [seekToSeconds]);

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

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || transcript.length === 0) return;
    
    const userQuery = query.trim();
    setQuery('');
    setChatHistory(prev => [...prev, { role: 'user', text: userQuery }]);
    setIsChatting(true);
    
    const fullTranscriptText = transcript.map(t => t.text).join(' ');
    const res = await chatWithVideo(fullTranscriptText, userQuery);
    
    if (res.success && res.text) {
      setChatHistory(prev => [...prev, { role: 'ai', text: res.text }]);
    } else {
      setChatHistory(prev => [...prev, { role: 'ai', text: res.error || 'Sorry, something went wrong.' }]);
    }
    setIsChatting(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0908] rounded-xl border border-white/5 overflow-hidden">
      {/* Top: Video */}
      <div className="relative w-full aspect-video shrink-0 bg-black">
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
      
      {/* Middle: Tab Bar */}
      <div className="flex items-center justify-between p-2 border-b border-white/5 bg-[#14120f] shrink-0">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('transcript')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === 'transcript' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <List className="w-3.5 h-3.5" /> Transcript
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === 'chat' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> AI Chat
          </button>
        </div>
        
        <button
          onClick={handleCapture}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 hover:bg-accent/20 text-accent rounded-md text-xs font-medium transition-colors"
          title="Capture Current Timestamp"
        >
          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Capture</span>
        </button>
      </div>

      {/* Bottom: Tab Content Area */}
      <div className="flex-1 overflow-hidden relative">
        
        {/* Transcript Tab */}
        {activeTab === 'transcript' && (
          <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-3">
            {loadingTranscript ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading transcript...
              </div>
            ) : transcriptError ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm px-6 text-center">
                <p>{transcriptError}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {transcript.map((line, i) => (
                  <button
                    key={i}
                    onClick={() => handleSeekToOffset(line.offset)}
                    className="flex gap-3 text-left p-2 hover:bg-white/5 rounded-lg transition-colors group"
                  >
                    <span className="text-xs text-accent font-mono shrink-0 pt-0.5 group-hover:text-white transition-colors">
                      {formatTimestamp(Math.floor(line.offset / 1000))}
                    </span>
                    <span className="text-sm text-gray-300 leading-snug" dangerouslySetInnerHTML={{ __html: line.text }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="absolute inset-0 flex flex-col">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4">
              {transcript.length === 0 ? (
                <div className="text-sm text-gray-500 text-center m-auto">
                  A transcript is required to chat with the video.
                </div>
              ) : chatHistory.length === 0 ? (
                <div className="text-sm text-gray-500 text-center m-auto flex flex-col items-center gap-2">
                  <MessageSquare className="w-8 h-8 opacity-50" />
                  Ask a question about this video!
                </div>
              ) : (
                chatHistory.map((msg, i) => (
                  <div key={i} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                      {msg.role === 'user' ? 'You' : 'AI'}
                    </span>
                    <div className={`p-3 rounded-xl text-sm leading-relaxed max-w-[85%] ${
                      msg.role === 'user' 
                        ? 'bg-accent/20 text-accent rounded-br-sm' 
                        : 'bg-white/5 text-gray-300 rounded-bl-sm border border-white/5'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
              {isChatting && (
                <div className="flex flex-col gap-1 items-start">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">AI</span>
                  <div className="p-3 rounded-xl bg-white/5 text-gray-300 rounded-bl-sm border border-white/5 flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-75" />
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-150" />
                  </div>
                </div>
              )}
            </div>
            
            {transcript.length > 0 && (
              <div className="p-3 bg-[#14120f] border-t border-white/5 shrink-0">
                <form onSubmit={handleChatSubmit} className="relative">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask about this video..."
                    disabled={isChatting}
                    className="w-full bg-black border border-white/10 rounded-lg pl-3 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-accent/50 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={isChatting || !query.trim()}
                    className="absolute right-1.5 top-1.5 p-1.5 text-gray-400 hover:text-white disabled:opacity-50 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
