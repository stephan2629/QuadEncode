'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { m, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, Trash2, ExternalLink, RefreshCw, PlayCircle, XCircle, NotebookPen, Loader2 } from 'lucide-react';
import { updatePathStepStatus, deletePath, createNoteForVideo, createNoteForPlaylist } from './actions';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { extractYouTubeId, extractYouTubePlaylistId } from '@/lib/youtube';
import { toast } from 'sonner';

interface Resource {
  id: string;
  title: string;
  url: string;
  provider: string;
  format: string;
  is_free: boolean;
  cost: string | null;
}

interface PathStep {
  id: string;
  order: number;
  status: 'unstarted' | 'completed';
  resources: Resource;
}

export interface PathData {
  id: string;
  subject_id: string;
  subjects: { name: string; slug: string };
  path_steps: PathStep[];
}

export default function PathTracker({ initialPaths }: { initialPaths: PathData[] }) {
  const router = useRouter();
  const [optimisticPaths, setOptimisticPaths] = useState(initialPaths);
  // Tracks the initialPaths reference so a change can be caught during
  // render (React's documented pattern for resetting state when a prop
  // changes: https://react.dev/learn/you-might-not-need-an-effect) rather
  // than in an effect, which would commit stale state for one extra frame
  // before a second render corrected it.
  const [prevInitialPaths, setPrevInitialPaths] = useState(initialPaths);
  const [loadingStepId, setLoadingStepId] = useState<string | null>(null);
  const [deletingPathId, setDeletingPathId] = useState<string | null>(null);
  const [activeVideoStepId, setActiveVideoStepId] = useState<string | null>(null);
  // The panel's height animates 0 -> auto (see the m.div below); mounting
  // the YouTube iframe immediately makes it load and paint its first frame
  // while the container is still being resized, which the browser renders
  // as a blurry, scaled bitmap instead of the sharp thumbnail. Waiting for
  // the expand animation to finish before mounting the iframe fixes it.
  const [readyVideoStepId, setReadyVideoStepId] = useState<string | null>(null);
  const [takingNotesStepId, setTakingNotesStepId] = useState<string | null>(null);

  if (initialPaths !== prevInitialPaths) {
    setPrevInitialPaths(initialPaths);
    setOptimisticPaths(initialPaths);
  }

  if (!optimisticPaths || optimisticPaths.length === 0) return null;

  const handleTakeNotes = async (subjectId: string, stepId: string, title: string, videoId: string | null, playlistId: string | null) => {
    setTakingNotesStepId(stepId);
    const result = videoId
      ? await createNoteForVideo(subjectId, title, videoId)
      : await createNoteForPlaylist(subjectId, title, playlistId!);
    if ('id' in result) {
      router.push(`/notes/${result.id}`);
    } else {
      setTakingNotesStepId(null);
      toast.error(result.error || 'Could not create a note for that video.');
    }
  };

  // Both actions below call revalidatePath('/dashboard') server-side, which
  // patches fresh RSC data into the page - that can reset the scroll
  // position of the dashboard's custom overflow-y-auto container (deleting
  // a card also shortens the page, which alone can force a scroll
  // reset). Capturing and restoring scrollTop across the update fixes both
  // causes regardless of which one is actually responsible.
  const withScrollPreserved = async <T,>(action: () => Promise<T>) => {
    const scrollEl = document.querySelector<HTMLElement>('[data-dashboard-scroll]');
    const scrollTop = scrollEl?.scrollTop;
    const result = await action();
    if (scrollEl && scrollTop != null) {
      requestAnimationFrame(() => { scrollEl.scrollTop = scrollTop; });
    }
    return result;
  };

  const handleToggle = async (pathId: string, stepId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'unstarted' : 'completed';
    setLoadingStepId(stepId);

    // Optimistic update
    setOptimisticPaths(prev => prev.map(p => {
      if (p.id !== pathId) return p;
      return {
        ...p,
        path_steps: p.path_steps.map(s => s.id === stepId ? { ...s, status: newStatus as "completed" | "unstarted" } : s)
      };
    }));

    const result = await withScrollPreserved(() => updatePathStepStatus(stepId, newStatus));
    if (result?.error) {
      setOptimisticPaths(initialPaths);
      toast.error(result.error);
    }
    setLoadingStepId(null);
  };

  const handleDelete = async (pathId: string) => {
    setDeletingPathId(pathId);
    const result = await withScrollPreserved(() => deletePath(pathId));
    if (result?.error) {
      setDeletingPathId(null);
      toast.error(result.error);
      return;
    }
    setOptimisticPaths(prev => prev.filter(p => p.id !== pathId));
    setDeletingPathId(null);
    toast.success('Path deleted');
  };

  return (
    <div className="space-y-6 mb-12">
      <h2 id="active-paths" className="text-xl md:text-2xl font-bold font-serif scroll-mt-6">Active paths</h2>
      <AnimatePresence initial={false}>
        {optimisticPaths.map((path) => {
          const sortedSteps = [...path.path_steps].sort((a, b) => a.order - b.order);
          const progress = Math.round((sortedSteps.filter(s => s.status === 'completed').length / sortedSteps.length) * 100);

          return (
            <m.div
              key={path.id}
              layout
              exit={{ opacity: 0, x: -16, transition: { duration: 0.15 } }}
              className="bg-[#14120f] border border-white/10 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-xl hover:border-white/20 transition-colors duration-200"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none"></div>

                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div>
                    <h3 className="text-lg font-bold font-serif text-accent flex items-center gap-2">
                      {path.subjects.name} Path
                    </h3>
                    <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <m.div
                          className="h-full bg-accent rounded-full"
                          initial={false}
                          animate={{ width: `${progress}%` }}
                          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                        />
                      </div>
                      <span>{progress}% Complete</span>
                    </div>
                  </div>
                  <ConfirmButton
                    confirmTitle="Are you sure you want to delete?"
                    confirmMessage=""
                    onClick={() => handleDelete(path.id)}
                    aria-label={`Delete path for ${path.subjects.name}`}
                    className="text-gray-500 hover:text-red-400 p-3.5 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
                  >
                    {deletingPathId === path.id ? <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Trash2 className="w-4 h-4" aria-hidden="true" />}
                  </ConfirmButton>
                </div>

                <div className="space-y-3 relative z-10">
                  {sortedSteps.map((step, i) => {
                    const isCompleted = step.status === 'completed';
                    const isVideo = step.resources?.format === 'video';
                    const stepVideoId = step.resources ? extractYouTubeId(step.resources.url) : null;
                    const stepPlaylistId = step.resources ? extractYouTubePlaylistId(step.resources.url) : null;
                    // Built with URLSearchParams rather than string-concatenating
                    // "?autoplay=1&..." onto the base - the playlist embed already
                    // has its own "?list=" query string, so appending a second "?"
                    // instead of "&" produced a malformed URL YouTube couldn't parse.
                    const embedSrc = (() => {
                      if (!stepVideoId && !stepPlaylistId) return null;
                      const url = stepVideoId
                        ? new URL(`https://www.youtube.com/embed/${stepVideoId}`)
                        : new URL('https://www.youtube.com/embed/videoseries');
                      if (stepPlaylistId) url.searchParams.set('list', stepPlaylistId);
                      url.searchParams.set('autoplay', '1');
                      if (typeof window !== 'undefined') url.searchParams.set('origin', window.location.origin);
                      return url.toString();
                    })();

                    return (
                      <m.div
                        key={step.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.12, delay: i * 0.04 }}
                        className={`flex flex-col gap-4 p-5 rounded-2xl border-2 transition-all duration-300 ${isCompleted ? 'bg-white/5 border-white/5 opacity-60' : 'bg-[#1a1815] border-white/10 hover:border-white/20'}`}
                      >
                        <div className="flex items-start gap-4 w-full">
                          <m.button
                            whileTap={{ scale: 0.85 }}
                            onClick={() => handleToggle(path.id, step.id, step.status)}
                            disabled={loadingStepId === step.id}
                            aria-label={isCompleted ? 'Mark step incomplete' : 'Mark step complete'}
                            aria-pressed={isCompleted}
                            className="shrink-0 -m-3 p-3 text-gray-400 hover:text-accent transition-colors disabled:opacity-50 rounded-lg"
                          >
                            {loadingStepId === step.id ? (
                              <RefreshCw className="w-5 h-5 animate-spin" aria-hidden="true" />
                            ) : isCompleted ? (
                              <CheckCircle2 className="w-5 h-5 text-accent" aria-hidden="true" />
                            ) : (
                              <Circle className="w-5 h-5" aria-hidden="true" />
                            )}
                          </m.button>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="text-xs font-mono text-gray-500 shrink-0">{step.order}</span>
                              {isVideo ? (
                                <button
                                  onClick={() => {
                                    setActiveVideoStepId(activeVideoStepId === step.id ? null : step.id);
                                    setReadyVideoStepId(null);
                                  }}
                                  className={`font-medium transition-colors flex items-center gap-1.5 text-left ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-200 hover:text-accent'}`}
                                >
                                  {step.resources?.title}
                                  <PlayCircle className="w-3.5 h-3.5 opacity-70 shrink-0" />
                                </button>
                              ) : null}
                              {isVideo && (stepVideoId || stepPlaylistId) && (
                                <button
                                  onClick={() =>
                                    handleTakeNotes(
                                      path.subject_id,
                                      step.id,
                                      step.resources.title,
                                      stepVideoId,
                                      stepPlaylistId
                                    )
                                  }
                                  disabled={takingNotesStepId === step.id}
                                  className="text-xs text-gray-500 hover:text-accent transition-colors flex items-center gap-1 shrink-0 disabled:opacity-50 py-3.5"
                                >
                                  {takingNotesStepId === step.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <NotebookPen className="w-3 h-3" />
                                  )}
                                  Take notes
                                </button>
                              )}
                              {!isVideo && (
                                <a
                                  href={step.resources?.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`font-medium transition-colors flex items-center gap-1.5 text-left ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-200 hover:text-accent'}`}
                                >
                                  {step.resources?.title}
                                  <ExternalLink className="w-3 h-3 opacity-50 shrink-0" />
                                </a>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
                              <span className="capitalize">{step.resources?.provider}</span>
                              <span>•</span>
                              <span className="capitalize">{isVideo ? 'Video' : 'Course/Read'}</span>
                              {!step.resources?.is_free && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-500/80">{step.resources?.cost || 'Paid'}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <AnimatePresence>
                          {activeVideoStepId === step.id && isVideo && (
                            <m.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              onAnimationComplete={() => {
                                if (activeVideoStepId === step.id) setReadyVideoStepId(step.id);
                              }}
                              className="w-full overflow-hidden"
                            >
                              <div className="pt-4 border-t border-white/10 mt-2 relative">
                                <div className="absolute top-6 right-2 z-10">
                                  <button
                                    onClick={() => setActiveVideoStepId(null)}
                                    className="bg-black/50 hover:bg-black/80 text-white rounded-full p-1.5 backdrop-blur-sm transition-colors"
                                  >
                                    <XCircle className="w-5 h-5" />
                                  </button>
                                </div>
                                <div className="relative w-full aspect-video min-h-[250px] md:min-h-[360px] rounded-xl overflow-hidden border border-white/10 bg-black shadow-lg">
                                  {embedSrc ? (
                                    readyVideoStepId === step.id ? (
                                      <iframe
                                        src={embedSrc}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        allowFullScreen
                                        title={step.resources?.title || "YouTube Video"}
                                        className="absolute top-0 left-0 w-full h-full border-0"
                                      ></iframe>
                                    ) : (
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <Loader2 className="w-6 h-6 text-gray-500 animate-spin" aria-hidden="true" />
                                      </div>
                                    )
                                  ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 p-6 text-center">
                                      <ExternalLink className="w-8 h-8 mb-4 opacity-50" />
                                      <p>This video format cannot be embedded.</p>
                                      <a
                                        href={step.resources?.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-accent hover:underline mt-2"
                                      >
                                        Watch on {step.resources?.provider}
                                      </a>
                                    </div>
                                  )}
                                </div>
                                {embedSrc && (
                                  <div className="mt-3 px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <p className="text-xs text-gray-500 font-medium">Video showing as unavailable?</p>
                                    <a
                                      href={step.resources?.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-accent hover:text-accent/80 transition-colors flex items-center gap-1.5"
                                    >
                                      Watch directly on YouTube <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                )}
                              </div>
                            </m.div>
                          )}
                        </AnimatePresence>
                      </m.div>
                    );
                  })}
                </div>
            </m.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
