'use client';

import { m } from 'framer-motion';
import Link from 'next/link';
import { BrainCircuit, BookOpen, ArrowLeft } from 'lucide-react';

export default function ReviewModeSelector({ subjectId }: { subjectId: string }) {
  return (
    <div className="min-h-screen bg-[#0a0908] flex flex-col items-center justify-center p-6 selection:bg-accent/30">
      <m.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-[#14120f] border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none"></div>

        <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-8 relative z-10 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to dashboard
        </Link>

        <h1 className="text-3xl md:text-4xl font-serif font-bold text-white mb-4 relative z-10">
          What do you want to review?
        </h1>
        <p className="text-gray-400 mb-10 relative z-10">
          Choose a session type. Both types will update your spaced-repetition schedule.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          {/* Flashcards Option */}
          <Link href={`/review?subject_id=${subjectId}&mode=flashcards`} className="group rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">
            <div className="h-full bg-[#1a1815] border border-white/5 hover:border-accent/50 rounded-2xl p-6 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:bg-[#1a1815]/80 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-white/5 group-hover:bg-accent/10 rounded-full flex items-center justify-center mb-4 transition-colors">
                <BookOpen className="w-8 h-8 text-gray-400 group-hover:text-accent transition-colors" />
              </div>
              <h2 className="text-xl font-bold font-serif text-white mb-2">Flashcards</h2>
              <p className="text-sm text-gray-500">
                Traditional front/back flashcards and fill-in-the-blank questions.
              </p>
            </div>
          </Link>

          {/* AI Quiz Option */}
          <Link href={`/review?subject_id=${subjectId}&mode=quiz`} className="group rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">
            <div className="h-full bg-[#1a1815] border border-white/5 hover:border-accent/50 rounded-2xl p-6 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:bg-[#1a1815]/80 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-white/5 group-hover:bg-accent/10 rounded-full flex items-center justify-center mb-4 transition-colors">
                <BrainCircuit className="w-8 h-8 text-gray-400 group-hover:text-accent transition-colors" />
              </div>
              <h2 className="text-xl font-bold font-serif text-white mb-2">Quiz</h2>
              <p className="text-sm text-gray-500">
                Multiple-choice questions from your notes, written by you or generated from an import.
              </p>
            </div>
          </Link>
        </div>
      </m.div>
    </div>
  );
}
