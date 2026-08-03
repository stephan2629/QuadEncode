'use client';

import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CompletionScreen() {
  return (
    <div className="min-h-screen bg-[#0a0908] text-white flex flex-col items-center justify-center p-6">
      <div className="text-center max-w-md">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-accent/10 mb-8 border border-accent/20"
        >
          <CheckCircle2 className="w-12 h-12 text-accent" aria-hidden="true" />
        </motion.div>
        <h1 className="text-4xl font-serif font-bold mb-4">You&apos;re all caught up!</h1>
        <p className="text-gray-400 mb-10 text-lg">
          No more cards are due for review.
        </p>
        <Link
          href="/dashboard"
          className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-full font-medium transition-all"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
