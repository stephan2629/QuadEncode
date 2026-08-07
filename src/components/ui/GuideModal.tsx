'use client';

import { m, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Video, Keyboard, Clock, Link2, PlaySquare, Scissors, Wand2 } from 'lucide-react';

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
                    <Video className="w-4 h-4 text-accent" /> Video notes
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-[#1a1815] p-4 rounded-xl border border-white/5">
                      <Clock className="w-5 h-5 text-gray-300 mb-2" />
                      <h4 className="text-sm font-semibold text-white mb-1">Capture timestamp</h4>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Click Capture Timestamp while watching to drop a time-linked marker into your note at the cursor.
                      </p>
                    </div>
                    <div className="bg-[#1a1815] p-4 rounded-xl border border-white/5">
                      <Link2 className="w-5 h-5 text-gray-300 mb-2" />
                      <h4 className="text-sm font-semibold text-white mb-1">Jump back to that moment</h4>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Click a captured timestamp link in your note to seek the video straight back to that second.
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

                    <div className="bg-[#1a1815] p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="font-mono text-xs text-gray-300">
                        Mitochondria: Powerhouse of the cell
                      </div>
                      <span className="text-xs text-gray-500 font-medium bg-white/5 px-2 py-1 rounded">➔ Front/Back Card</span>
                    </div>
                    <p className="text-xs text-gray-500 -mt-1">No markup needed - a plain &quot;Term: Definition&quot; or &quot;Term - Definition&quot; line works too.</p>
                  </div>
                </section>

                {/* Turn text into cards - keyboard shortcut and its
                    no-keyboard equivalents side by side, so this isn't just
                    a Mac/desktop-only page. */}
                <section>
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-widest text-gray-400">
                    <Keyboard className="w-4 h-4 text-accent" /> Turn text into cards
                  </h3>
                  <div className="flex flex-col gap-3">
                    <div className="bg-[#1a1815] p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-1">Cloze deletion (fill in the blank)</h4>
                        <p className="text-xs text-gray-400">Highlight any text in your editor, then press the shortcut on a keyboard, or tap the scissors button in the toolbar on any device.</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 sm:ml-4">
                        <div className="flex items-center gap-1">
                          <kbd className="px-2 py-1 bg-white/10 border border-white/10 rounded text-xs font-mono text-gray-300">Ctrl/Cmd</kbd>
                          <span className="text-gray-500">+</span>
                          <kbd className="px-2 py-1 bg-white/10 border border-white/10 rounded text-xs font-mono text-gray-300">K</kbd>
                        </div>
                        <span className="text-xs text-gray-600">or</span>
                        <div className="p-1.5 bg-white/10 border border-white/10 rounded" title="Toolbar button">
                          <Scissors className="w-3.5 h-3.5 text-gray-300" aria-hidden="true" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#1a1815] p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-1">Generate from your notes</h4>
                        <p className="text-xs text-gray-400">Write normally, no syntax needed, then hit &quot;Generate 10 Quizzes &amp; 10 Cards&quot; on the Quiz tab. Same on every device, 2 free generations a day.</p>
                      </div>
                      <Wand2 className="w-5 h-5 text-gray-300 shrink-0" aria-hidden="true" />
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
