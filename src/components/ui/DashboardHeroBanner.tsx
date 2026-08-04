'use client';

import { m } from 'framer-motion';
import Image from 'next/image';
import { Sparkles, Brain, BookOpen, Layers } from 'lucide-react';

interface DashboardHeroBannerProps {
  subjectName?: string;
  totalCards: number;
  dueCount: number;
  noteCount: number;
}

export function DashboardHeroBanner({
  subjectName = 'Study Workspace',
  totalCards,
  dueCount,
  noteCount,
}: DashboardHeroBannerProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative w-full rounded-3xl overflow-hidden mb-10 border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.6)] group"
    >
      {/* Background Image with Dark Vignette Overlay */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <Image
          src="/dashboard-banner.png"
          alt="Study Workspace Banner"
          fill
          priority
          className="object-cover object-center opacity-40 group-hover:scale-105 transition-transform duration-700 ease-out filter brightness-75 contrast-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0908] via-[#0a0908]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0908] via-[#0a0908]/40 to-transparent" />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 p-6 sm:p-8 md:p-12 flex flex-col md:flex-row justify-between md:items-end gap-6">
        <div className="max-w-xl">
          <m.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-semibold uppercase tracking-wider mb-3 backdrop-blur-md"
          >
            <Sparkles className="w-3.5 h-3.5" /> Active learning workspace
          </m.div>

          <m.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="text-2xl sm:text-4xl md:text-5xl font-bold font-serif text-white tracking-tight leading-tight"
          >
            {subjectName}
          </m.h2>

          <m.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="text-gray-300 text-xs sm:text-sm md:text-base mt-2 font-light max-w-md leading-relaxed"
          >
            Instant-reveal flashcards on a Leitner schedule, built from your own notes.
          </m.p>
        </div>

        {/* Quick Stats Badges */}
        <m.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="flex items-center gap-3 sm:gap-4 flex-wrap"
        >
          <div className="bg-[#14120f]/80 backdrop-blur-xl border border-white/10 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-lg">
            <div className="p-2 rounded-xl bg-accent/10 text-accent">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-gray-400 font-medium">Total notes</div>
              <div className="text-lg font-bold text-white font-serif">{noteCount}</div>
            </div>
          </div>

          <div className="bg-[#14120f]/80 backdrop-blur-xl border border-white/10 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-lg">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-gray-400 font-medium">Flashcards</div>
              <div className="text-lg font-bold text-white font-serif">{totalCards}</div>
            </div>
          </div>

          {dueCount > 0 && (
            <div className="bg-accent/20 backdrop-blur-xl border border-accent/40 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <div className="p-2 rounded-xl bg-accent text-[#0a0908]">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-accent font-bold uppercase tracking-wider">Due review</div>
                <div className="text-lg font-bold text-white font-serif">{dueCount} cards</div>
              </div>
            </div>
          )}
        </m.div>
      </div>
    </m.div>
  );
}
