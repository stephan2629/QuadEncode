'use client';

import { m } from "framer-motion";
import Link from 'next/link';
import { Info } from 'lucide-react';

export default function SubjectNav({
  subjectId,
  dueCount,
  totalCards,
  importCount,
}: {
  subjectId: string;
  dueCount: number;
  totalCards: number;
  importCount: number;
}) {
  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.12 }}
      className="flex items-center gap-4 mt-4 mb-2"
    >
      {totalCards > 0 && (
        <div className="flex items-center gap-2 group/tooltip relative">
          <Link
            href={`/review?subject_id=${subjectId}`}
            className={
              dueCount > 0
                ? 'text-sm md:text-base bg-accent text-[#0a0908] px-5 py-1.5 rounded-full font-bold hover:bg-accent/90 transition-colors'
                : 'text-sm md:text-base text-gray-400 hover:text-white transition-colors'
            }
          >
            Review
          </Link>
          <div className="text-gray-500 hover:text-gray-300 transition-colors cursor-help">
            <Info className="w-4 h-4" />
          </div>
          {/* Tooltip */}
          <div className="absolute left-0 bottom-full mb-2 hidden group-hover/tooltip:block w-64 p-3 bg-[#1a1815] border border-white/10 rounded-lg text-xs text-gray-300 shadow-xl z-50">
            Cards move up a box when you remember them. Box 4 means it&apos;s stored in long-term memory.
          </div>
        </div>
      )}

      {importCount > 0 && (
        <Link href={`/imports?subject_id=${subjectId}`} className="text-sm md:text-base text-gray-400 hover:text-white transition-colors">
          Imports
        </Link>
      )}
    </m.div>
  );
}
