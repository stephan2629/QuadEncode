'use client';

import { m } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { Play, Sparkles, Command, Compass, Brain } from 'lucide-react';
import { TiltCard } from './TiltCard';

interface QuickStudyHubProps {
  activeSubjectId?: string;
  dueCount: number;
  hasCards: boolean;
}

export function QuickStudyHub({ activeSubjectId, dueCount, hasCards }: QuickStudyHubProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="mb-12"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold font-serif text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" /> Quick study hub
          </h3>
          <p className="text-xs text-gray-400 font-light mt-0.5">Jump directly into recall, path discovery, or instant command search.</p>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-6 ${hasCards ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        {/* 1. Review Shortcut Card - only once a card exists to review, per
            CLAUDE.md section 3 (progressive disclosure): review/quiz UI is an
            absence, not an empty state, until the user has actually made one. */}
        {hasCards && (
          <TiltCard tiltAmount={4} className="h-full">
            <Link
              href={activeSubjectId ? `/review?subject_id=${activeSubjectId}` : '/review'}
              className="group relative flex flex-col justify-between p-6 h-full min-h-[180px] bg-[#14120f]/80 backdrop-blur-xl border border-white/10 hover:border-accent/40 rounded-3xl overflow-hidden shadow-xl transition-all duration-500 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] block"
            >
              <div className="absolute -top-12 -right-12 w-36 h-36 bg-accent/10 rounded-full blur-2xl group-hover:bg-accent/20 transition-all pointer-events-none" />

              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-accent/10 border border-accent/20 text-accent group-hover:scale-110 transition-transform duration-300">
                    <Brain className="w-6 h-6" />
                  </div>
                  {dueCount > 0 && (
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-accent text-[#0a0908] shadow-md">
                      {dueCount} due
                    </span>
                  )}
                </div>
                <h4 className="text-lg font-bold font-serif text-white group-hover:text-accent transition-colors">
                  Start spaced repetition
                </h4>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed font-light">
                  Flip 0ms cards using memory box intervals to retain information long-term.
                </p>
              </div>

              <div className="mt-6 flex items-center text-xs font-semibold text-accent gap-2 group-hover:translate-x-1 transition-transform">
                <span>Review now</span>
                <Play className="w-3.5 h-3.5 fill-accent" />
              </div>
            </Link>
          </TiltCard>
        )}

        {/* 2. Path Discovery Card */}
        <TiltCard tiltAmount={4} className="h-full">
          <Link
            href="/"
            className="group relative flex flex-col justify-between p-6 h-full min-h-[180px] bg-[#14120f]/80 backdrop-blur-xl border border-white/10 hover:border-amber-500/40 rounded-3xl overflow-hidden shadow-xl transition-all duration-500 hover:shadow-[0_0_30px_rgba(245,158,11,0.12)] block"
          >
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none" />
            
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform duration-300">
                  <Compass className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400">
                  AI curated
                </span>
              </div>
              <h4 className="text-lg font-bold font-serif text-white group-hover:text-amber-400 transition-colors">
                Discover learning paths
              </h4>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed font-light">
                Type any subject to instantly curate top-rated video courses and documentation.
              </p>
            </div>

            <div className="mt-6 flex items-center text-xs font-semibold text-amber-400 gap-2 group-hover:translate-x-1 transition-transform">
              <span>Search paths</span>
              <Compass className="w-3.5 h-3.5" />
            </div>
          </Link>
        </TiltCard>

        {/* 3. Command Palette Shortcut Card with Artwork Background */}
        <TiltCard tiltAmount={4} className="h-full">
          <div className="group relative flex flex-col justify-between p-6 h-full min-h-[180px] bg-[#14120f]/90 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-xl transition-all duration-500">
            <Image
              src="/dashboard-art.png"
              alt="Memory Cards Artwork"
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover object-center opacity-30 group-hover:scale-105 transition-transform duration-700 pointer-events-none filter contrast-125"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0908] via-[#0a0908]/80 to-transparent pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-2xl bg-white/10 border border-white/20 text-white group-hover:scale-110 transition-transform duration-300">
                  <Command className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/10 border border-white/10 text-gray-300">
                  ⌘K / Ctrl+K
                </span>
              </div>
              <h4 className="text-lg font-bold font-serif text-white">
                Command palette
              </h4>
              <p className="text-xs text-gray-300 mt-1 leading-relaxed font-light">
                Press ⌘K anywhere to jump across subjects, notes, and instant study tools.
              </p>
            </div>

            <div className="relative z-10 mt-6 flex items-center text-xs font-mono text-gray-400">
              Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/10 text-white mx-1">⌘K</kbd> to launch
            </div>
          </div>
        </TiltCard>
      </div>
    </m.div>
  );
}
