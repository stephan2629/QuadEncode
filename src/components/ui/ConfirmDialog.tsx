'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { m, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// Adapted from a UIverse.io component by Yaya12085 (a light-theme
// "deactivate account" card, no overlay of its own) - recolored to the
// app's warm-near-black palette per CLAUDE.md section 12, and wrapped in
// the same backdrop/AnimatePresence modal shell GuideModal.tsx already
// uses. Generic confirm/cancel dialog, not account-specific - shared by
// delete account, delete note, and delete path via ConfirmButton.
export default function ConfirmDialog({ isOpen, title, message, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  // Every call site renders this from inside a Framer Motion m.div card
  // (PathTracker's path cards, NotesGrid's note cards) that applies
  // `transform` during its own entrance animation. A `transform` on any
  // ancestor creates a new containing block for `position: fixed`
  // descendants, so without a portal this dialog was sized/positioned
  // relative to that small card instead of the viewport - it could render
  // clipped or tucked behind other content instead of covering the page.
  // Portaling to document.body sidesteps that entirely.
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <m.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            className="bg-[#14120f] border border-white/10 w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center"
          >
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400" aria-hidden="true" />
            </div>
            <h2 id="confirm-dialog-title" className={`text-base font-bold text-white ${message ? 'mb-1.5' : 'mb-6'}`}>
              {title}
            </h2>
            {message && <p className="text-sm text-gray-400 leading-relaxed mb-6">{message}</p>}
            {/* No backdrop-click and no Escape handler, deliberately: a
                destructive delete confirmation must be left via an explicit
                choice, not an accidental miss-click or key press. */}
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onConfirm}
                className="w-full py-3 min-h-[44px] rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors active:scale-95 cursor-pointer"
              >
                {confirmLabel}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="w-full py-3 min-h-[44px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-medium text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
