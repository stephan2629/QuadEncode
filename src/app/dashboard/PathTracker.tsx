'use client';

import { useState } from 'react';
import { m, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, Trash2, ExternalLink, RefreshCw, PlayCircle, XCircle } from 'lucide-react';
import { updatePathStepStatus, deletePath } from './actions';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { TiltCard } from '@/components/ui/TiltCard';

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

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
  return match ? match[1] : null;
}

export default function PathTracker({ initialPaths }: { initialPaths: PathData[] }) {
  const [optimisticPaths, setOptimisticPaths] = useState(initialPaths);
  const [loadingStepId, setLoadingStepId] = useState<string | null>(null);
  const [deletingPathId, setDeletingPathId] = useState<string | null>(null);
  const [activeVideoStepId, setActiveVideoStepId] = useState<string | null>(null);

  if (!optimisticPaths || optimisticPaths.length === 0) return null;

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

    await updatePathStepStatus(stepId, newStatus);
    setLoadingStepId(null);
  };

  const handleDelete = async (pathId: string) => {
    setDeletingPathId(pathId);
    await deletePath(pathId);
    setOptimisticPaths(prev => prev.filter(p => p.id !== pathId));
    setDeletingPathId(null);
  };

  return (
    <div className="space-y-6 mb-12">
      <h2 className="text-xl md:text-2xl font-bold font-serif">Active Paths</h2>
      <AnimatePresence initial={false}>
        {optimisticPaths.map((path) => {
          const sortedSteps = [...path.path_steps].sort((a, b) => a.order - b.order);
          const progress = Math.round((sortedSteps.filter(s => s.status === 'completed').length / sortedSteps.length) * 100);

          return (
            <m.div
              key={path.id}
              layout
              exit={{ opacity: 0, x: -16, transition: { duration: 0.15 } }}
              className="group perspective-[1000px]"
            >
              <TiltCard className="bg-[#14120f] border-2 border-white/10 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none"></div>

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
                    confirmMessage={`Delete the path for "${path.subjects.name}"?`}
                    onClick={() => handleDelete(path.id)}
                    className="text-gray-500 hover:text-red-400 p-2 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
                  >
                    {deletingPathId === path.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </ConfirmButton>
                </div>

                <div className="space-y-3 relative z-10">
                  {sortedSteps.map((step, i) => {
                    const isCompleted = step.status === 'completed';
                    const isVideo = step.resources?.format === 'video';

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
                            className="mt-0.5 text-gray-400 hover:text-accent transition-colors disabled:opacity-50"
                          >
                            {loadingStepId === step.id ? (
                              <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : isCompleted ? (
                              <CheckCircle2 className="w-5 h-5 text-accent" />
                            ) : (
                              <Circle className="w-5 h-5" />
                            )}
                          </m.button>

                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-gray-500">{step.order}</span>
                              {isVideo ? (
                                <button
                                  onClick={() => setActiveVideoStepId(activeVideoStepId === step.id ? null : step.id)}
                                  className={`font-medium transition-colors flex items-center gap-1.5 ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-200 hover:text-accent'}`}
                                >
                                  {step.resources?.title}
                                  <PlayCircle className="w-3.5 h-3.5 opacity-70" />
                                </button>
                              ) : (
                                <a
                                  href={step.resources?.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`font-medium transition-colors flex items-center gap-1.5 ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-200 hover:text-accent'}`}
                                >
                                  {step.resources?.title}
                                  <ExternalLink className="w-3 h-3 opacity-50" />
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
                                <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-black">
                                  {getYouTubeId(step.resources?.url) ? (
                                    <iframe
                                      src={`https://www.youtube.com/embed/${getYouTubeId(step.resources!.url)}?autoplay=1`}
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                      className="absolute inset-0 w-full h-full"
                                    ></iframe>
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
                                {getYouTubeId(step.resources?.url) && (
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
              </TiltCard>
            </m.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
