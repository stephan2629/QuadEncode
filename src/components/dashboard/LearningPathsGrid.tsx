'use client';

import { m } from 'framer-motion';
import Link from 'next/link';
import { BookOpen, Brain, Edit3, Play, Sparkles } from 'lucide-react';
import { TiltCard } from '../ui/TiltCard';

export interface SubjectPath {
  id: string;
  name: string;
  slug: string;
  dueCount: number;
  totalCards: number;
  retentionRate: number; // e.g. 85 for 85%
  noteCount: number;
  lastNoteId?: string;
}

export function LearningPathsGrid({ paths }: { paths: SubjectPath[] }) {
  if (paths.length === 0) {
    return (
      <div className="p-8 text-center border border-white/10 rounded-3xl bg-[#14120f] border-dashed">
        <BookOpen className="w-10 h-10 text-gray-500 mx-auto mb-3" />
        <h4 className="text-lg font-serif font-bold text-white mb-1">No learning paths yet</h4>
        <p className="text-xs text-gray-400 max-w-sm mx-auto">Create or search a topic to build your first active recall path.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {paths.map((path, idx) => (
        <m.div
          key={path.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: idx * 0.05 }}
          className="h-full"
        >
          <div className="group relative flex flex-col justify-between p-6 h-full min-h-[220px] bg-[#14120f]/90 backdrop-blur-xl border border-white/10 hover:border-accent/40 rounded-3xl overflow-hidden shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl group-hover:bg-accent/15 transition-all pointer-events-none" />

            {/* Card Header */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent bg-accent/10 border border-accent/20 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> Path
                </span>
                {path.dueCount > 0 ? (
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-accent text-[#0a0908] shadow-md">
                    {path.dueCount} due
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-gray-400 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">
                    Up to date
                  </span>
                )}
              </div>

              <h3 className="text-xl font-bold font-serif text-white group-hover:text-accent transition-colors line-clamp-1">
                {path.name}
              </h3>

              {/* Progress / Retention Indicator Bar */}
              <div className="mt-4 mb-5">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-gray-400 font-medium">Memory retention</span>
                  <span className="font-mono text-accent font-bold">{path.retentionRate}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden p-0.5 border border-white/5">
                  <m.div
                    initial={{ width: 0 }}
                    animate={{ width: `${path.retentionRate}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="h-full rounded-full bg-gradient-to-r from-amber-600 to-accent"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-500 mt-2 font-mono">
                  <span>{path.noteCount} notes</span>
                  <span>{path.totalCards} cards</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-4 border-t border-white/5 relative z-10">
              {path.lastNoteId ? (
                <Link
                  href={`/notes/${path.lastNoteId}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit Notes
                </Link>
              ) : (
                <Link
                  href={`/dashboard?subject_id=${path.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit Notes
                </Link>
              )}

              <Link
                href={`/review?subject_id=${path.id}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-accent/20 hover:bg-accent/30 border border-accent/40 text-xs font-bold text-accent transition-colors shadow-sm"
              >
                <Brain className="w-3.5 h-3.5" /> Practice
              </Link>
            </div>
          </div>
        </m.div>
      ))}
    </div>
  );
}
