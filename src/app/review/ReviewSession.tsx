'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { submitReview, keepCard, updateCard, deleteCard } from './actions';
import CompletionScreen from './CompletionScreen';

interface Card {
  id: string;
  note_id: string;
  line: number;
  tier: string;
  type: string;
  prompt: string;
  answer: string;
  box: number;
  due: string;
  fails: number;
}

type Stage = 'question' | 'answer' | 'wrong-feedback' | 'editing';

interface SessionResult {
  card: Card;
  correct: boolean;
}

export default function ReviewSession({ initialQueue }: { initialQueue: Card[] }) {
  const [queue] = useState(initialQueue);
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<Stage>('question');
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editDraft, setEditDraft] = useState({ prompt: '', answer: '' });
  const [edited, setEdited] = useState<{ prompt: string; answer: string } | null>(null);
  const [results, setResults] = useState<SessionResult[]>([]);

  if (index >= queue.length) {
    return <CompletionScreen results={results} />;
  }

  const card = queue[index];
  const isBoxZero = card.box === 0;
  const displayPrompt = edited?.prompt ?? card.prompt;
  const displayAnswer = edited?.answer ?? card.answer;

  const advance = (direction: 'left' | 'right') => {
    setExitDirection(direction);
    setIsExiting(true);
    setTimeout(() => {
      setIndex((i) => i + 1);
      setStage('question');
      setEdited(null);
      setIsExiting(false);
      setExitDirection(null);
    }, 150);
  };

  const handleReveal = () => {
    if (stage === 'question') setStage('answer');
  };

  const handleRate = async (correct: boolean) => {
    if (busy) return;
    setBusy(true);
    await submitReview(card.id, correct);
    setResults((prev) => [...prev, { card, correct }]);
    setBusy(false);
    if (correct) {
      advance('right');
    } else {
      setStage('wrong-feedback');
    }
  };

  const handleKeep = async () => {
    if (busy) return;
    setBusy(true);
    await keepCard(card.id);
    setBusy(false);
    advance('right');
  };

  const handleDelete = async () => {
    if (busy) return;
    setBusy(true);
    await deleteCard(card.id);
    setBusy(false);
    advance('left');
  };

  const startEdit = () => {
    setEditDraft({ prompt: displayPrompt, answer: displayAnswer });
    setStage('editing');
  };

  const saveEdit = async () => {
    if (busy) return;
    setBusy(true);
    await updateCard(card.id, editDraft.prompt, editDraft.answer);
    setEdited({ prompt: editDraft.prompt, answer: editDraft.answer });
    setBusy(false);
    setStage('answer');
  };

  return (
    <div className="min-h-screen bg-[#0a0908] text-white flex flex-col">
      <header className="flex justify-between items-center p-6 md:p-10">
        <Link href="/dashboard" className="text-gray-500 hover:text-white transition-colors flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" aria-hidden="true" /> Dashboard
        </Link>
        <div className="text-sm text-gray-500 font-medium font-mono">
          {index + 1} / {queue.length}
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {!isExiting && (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, x: 0 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: exitDirection === 'left' ? -100 : exitDirection === 'right' ? 100 : 0 }}
                transition={{ duration: 0.15, ease: 'easeIn' }}
                className="bg-[#14120f] border border-white/10 p-8 md:p-12 rounded-3xl shadow-2xl relative"
              >
                <div className="absolute top-4 left-4">
                  <BrainCircuit className="w-6 h-6 text-accent/30" aria-hidden="true" />
                </div>
                {isBoxZero && (
                  <div className="absolute top-4 right-4 text-[10px] font-bold tracking-wider text-accent uppercase">
                    New card
                  </div>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.12, ease: 'easeOut' }}
                  className="min-h-[200px] flex flex-col justify-center items-center text-center"
                >
                  {stage === 'editing' ? (
                    <div className="w-full text-left space-y-4">
                      <div>
                        <label htmlFor="edit-prompt" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                          Prompt
                        </label>
                        <textarea
                          id="edit-prompt"
                          value={editDraft.prompt}
                          onChange={(e) => setEditDraft((d) => ({ ...d, prompt: e.target.value }))}
                          className="w-full bg-[#0a0908] border border-white/10 rounded-lg p-3 text-white font-serif resize-none focus:outline-none focus:border-accent/50"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label htmlFor="edit-answer" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                          Answer
                        </label>
                        <textarea
                          id="edit-answer"
                          value={editDraft.answer}
                          onChange={(e) => setEditDraft((d) => ({ ...d, answer: e.target.value }))}
                          className="w-full bg-[#0a0908] border border-white/10 rounded-lg p-3 text-white resize-none focus:outline-none focus:border-accent/50"
                          rows={2}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-2xl md:text-3xl font-serif leading-relaxed">{displayPrompt}</h2>
                      {/* INSTANT REVEAL: no transition, no fade */}
                      {stage !== 'question' && (
                        <div className="w-full pt-8 mt-8 border-t border-white/10">
                          <p className="text-lg md:text-xl text-gray-300 font-light">{displayAnswer}</p>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-12 flex flex-col items-center gap-4 min-h-20">
            {stage === 'question' && (
              <button
                onClick={handleReveal}
                className="w-full md:w-auto px-12 py-4 bg-white/10 hover:bg-white/20 rounded-xl font-bold tracking-wide transition-all"
              >
                Show Answer
              </button>
            )}

            {stage === 'answer' && isBoxZero && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { staggerChildren: 0.03 } }}
                className="grid grid-cols-3 gap-3 w-full"
              >
                <motion.button
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.1 } }}
                  onClick={handleKeep}
                  className="px-4 py-3 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-xl font-medium transition-colors"
                >
                  Keep
                </motion.button>
                <motion.button
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.1 } }}
                  onClick={startEdit}
                  className="px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-xl font-medium transition-colors"
                >
                  Edit
                </motion.button>
                <motion.button
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.1 } }}
                  onClick={handleDelete}
                  className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-medium transition-colors"
                >
                  Delete
                </motion.button>
              </motion.div>
            )}

            {stage === 'answer' && !isBoxZero && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { staggerChildren: 0.03 } }}
                className="grid grid-cols-2 gap-3 w-full"
              >
                <motion.button
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.1 } }}
                  onClick={() => handleRate(false)}
                  className="px-6 py-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-bold transition-colors"
                >
                  Wrong
                </motion.button>
                <motion.button
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.1 } }}
                  onClick={() => handleRate(true)}
                  className="px-6 py-4 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-xl font-bold transition-colors"
                >
                  Correct
                </motion.button>
              </motion.div>
            )}

            {stage === 'editing' && (
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setStage('answer')}
                  className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  className="flex-1 px-6 py-3 bg-accent/20 hover:bg-accent/30 text-accent rounded-xl font-medium transition-colors"
                >
                  Save
                </button>
              </div>
            )}

            {stage === 'wrong-feedback' && (
              <div className="flex flex-col items-center gap-3 w-full">
                <Link
                  href={`/notes/${card.note_id}?line=${card.line}`}
                  className="text-sm text-accent hover:text-accent-muted underline underline-offset-2"
                >
                  Jump to note
                </Link>
                <button
                  onClick={() => advance('left')}
                  className="w-full md:w-auto px-12 py-4 bg-white/10 hover:bg-white/20 rounded-xl font-bold tracking-wide transition-all"
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
