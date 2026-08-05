'use client';

import React, { useRef } from 'react';
import { m, useScroll, useTransform } from 'framer-motion';
import { BrainCircuit, MoveRight, Sparkles, Zap, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export function ContainerScrollAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const rotateX = useTransform(scrollYProgress, [0, 0.5], [20, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [0.92, 1]);
  const translateY = useTransform(scrollYProgress, [0, 0.5], [60, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.25], [0, 1]);

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-6xl mx-auto py-20 px-4 md:px-6 flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-accent/10 blur-[130px] rounded-full pointer-events-none -z-10" />

      {/* Header Section */}
      <m.div 
        style={{ opacity }} 
        className="text-center max-w-3xl mx-auto mb-12"
      >
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-mono font-bold uppercase tracking-wider mb-4">
          <Sparkles className="w-3.5 h-3.5 text-accent" /> Active Recall Architecture
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-serif text-white tracking-tight leading-tight">
          Designed for maximum <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent via-yellow-400 to-amber-500">long-term memory</span> retention.
        </h2>
        <p className="text-gray-300 text-sm md:text-base mt-4 font-light leading-relaxed">
          Scroll through how Quad Encode transforms raw notes and open-web topics into high-efficiency active recall prompts.
        </p>
      </m.div>

      {/* 3D Perspective Scroll Container */}
      <div className="w-full relative [perspective:1000px]">
        <m.div
          style={{
            rotateX,
            scale,
            translateY,
          }}
          className="w-full bg-[#14120F]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 md:p-10 shadow-[0_20px_80px_rgba(0,0,0,0.8)] relative overflow-hidden"
        >
          {/* Section label, matching the badge convention used everywhere
              else in the app (kicker badge, "AI curated", "Due review") -
              not a fake window chrome borrowed from a generic SaaS template. */}
          <div className="flex items-center justify-between pb-6 mb-6 border-b border-white/10">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
              The mechanic
            </span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent bg-accent/10 border border-accent/20 px-2.5 py-1 rounded-full">
              0ms answer reveal
            </span>
          </div>

          {/* Grid Content */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="bg-[#0a0908] border border-white/10 rounded-2xl p-6 hover:border-accent/40 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-4 text-accent group-hover:scale-110 transition-transform">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold font-serif text-white mb-2">1. Ranked learning paths</h3>
              <p className="text-xs text-gray-400 leading-relaxed font-light">
                Type any skill or certification. Quad Encode curates top video courses and web docs into structured paths.
              </p>
            </div>

            <div className="bg-[#0a0908] border border-white/10 rounded-2xl p-6 hover:border-accent/40 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-4 text-accent group-hover:scale-110 transition-transform">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold font-serif text-white mb-2">2. Type before you see</h3>
              <p className="text-xs text-gray-400 leading-relaxed font-light">
                No passive card flipping. You must type your attempt before Quad Encode reveals the canonical answer.
              </p>
            </div>

            <div className="bg-[#0a0908] border border-white/10 rounded-2xl p-6 hover:border-accent/40 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-4 text-accent group-hover:scale-110 transition-transform">
                <RefreshCw className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold font-serif text-white mb-2">3. Memory box schedule</h3>
              <p className="text-xs text-gray-400 leading-relaxed font-light">
                Missed cards drop back to Box 0. Mastered items advance to 1d, 3d, 7d, and 21d interval reviews.
              </p>
            </div>
          </div>

          {/* CTA Footer */}
          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
            <div>
              <p className="text-sm font-serif font-bold text-white">Ready to study without the boredom?</p>
              <p className="text-xs text-gray-400 font-light">Join Quad Encode and force active recall on every topic.</p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-xs md:text-sm font-bold text-[#0a0908] bg-gradient-to-r from-accent to-amber-500 hover:brightness-110 px-6 py-2.5 rounded-full transition-all active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
            >
              Start studying now <MoveRight className="w-4 h-4" />
            </Link>
          </div>
        </m.div>
      </div>
    </div>
  );
}
