'use client';

import { m, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Video, Keyboard, ClipboardPlus, List, PlaySquare } from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GuideModal({ isOpen, onClose }: GuideModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
            onClick={onClose}
          >
            <m.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-[#14120f] border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/5 bg-[#1a1815]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent/10 rounded-lg text-accent">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">Editor guide</h2>
                    <p className="text-xs text-gray-400">Master the QuadEncode learning tools</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex flex-col gap-8">
                
                {/* Video Features */}
                <section>
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-widest text-gray-400">
                    <Video className="w-4 h-4 text-accent" /> Video & transcript
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-[#1a1815] p-4 rounded-xl border border-white/5">
                      <List className="w-5 h-5 text-gray-300 mb-2" />
                      <h4 className="text-sm font-semibold text-white mb-1">Interactive transcript</h4>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        The transcript panel loads the spoken words from the video. Click any line to jump the player to that moment.
                      </p>
                    </div>
                    <div className="bg-[#1a1815] p-4 rounded-xl border border-white/5">
                      <ClipboardPlus className="w-5 h-5 text-gray-300 mb-2" />
                      <h4 className="text-sm font-semibold text-white mb-1">Copy lines into your note</h4>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Hover a transcript line and click the copy icon to drop it into your note with a timestamp link back to that moment.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Markdown Triggers */}
                <section>
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-widest text-gray-400">
                    <PlaySquare className="w-4 h-4 text-accent" /> Smart Flashcards
                  </h3>
                  <p className="text-xs text-gray-400 mb-4">Type these anywhere in your notes to automatically generate spaced-repetition flashcards in the Practice tab.</p>
                  <div className="flex flex-col gap-3">
                    <div className="bg-[#1a1815] p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="font-mono text-xs text-gray-300">
                        <span className="text-accent">**Vocab:**</span> Mitochondria<br/>
                        <span className="text-accent">**Def:**</span> Powerhouse of the cell
                      </div>
                      <span className="text-xs text-gray-500 font-medium bg-white/5 px-2 py-1 rounded">➔ Front/Back Card</span>
                    </div>
                    
                    <div className="bg-[#1a1815] p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="font-mono text-xs text-gray-300">
                        <span className="text-accent">**Quiz:**</span> What is 2+2?<br/>
                        <span className="text-accent">**A:**</span> 4 | 5 | 22
                      </div>
                      <span className="text-xs text-gray-500 font-medium bg-white/5 px-2 py-1 rounded">➔ Multiple Choice</span>
                    </div>
                  </div>
                </section>

                {/* Keyboard Shortcuts */}
                <section>
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-widest text-gray-400">
                    <Keyboard className="w-4 h-4 text-accent" /> Keyboard Shortcuts
                  </h3>
                  <div className="bg-[#1a1815] p-4 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-1">Cloze deletion (fill in the blank)</h4>
                        <p className="text-xs text-gray-400">Highlight any text in your editor and press the shortcut to turn it into a fill-in-the-blank flashcard.</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-4">
                        <kbd className="px-2 py-1 bg-white/10 border border-white/10 rounded text-xs font-mono text-gray-300">Cmd</kbd>
                        <span className="text-gray-500">+</span>
                        <kbd className="px-2 py-1 bg-white/10 border border-white/10 rounded text-xs font-mono text-gray-300">K</kbd>
                      </div>
                    </div>
                  </div>
                </section>

              </div>
              
              {/* Footer */}
              <div className="p-4 sm:p-6 border-t border-white/5 bg-[#14120f] flex justify-end">
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                >
                  Got it
                </button>
              </div>

            </m.div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}
