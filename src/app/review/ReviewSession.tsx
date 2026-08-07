'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, BrainCircuit, Check, X, ArrowRight } from 'lucide-react';
import { m, AnimatePresence } from "framer-motion";
import { submitReview, keepCard, updateCard, deleteCard, graduateCard } from './actions';
import CompletionScreen from './CompletionScreen';
import { seededShuffle } from '@/lib/utils';
import { flashcardTextSizeClass } from '@/lib/flashcardTextSize';

interface Card {
  id: string;
  note_id: string;
  line: number;
  tier: string;
  type: string;
  prompt: string;
  answer: string;
  explanation?: string | null;
  box: number;
  due: string;
  fails: number;
}

type Stage = 'question' | 'answer' | 'wrong-feedback' | 'editing' | 're-explain';

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
  const [picked, setPicked] = useState<string | null>(null);
  const [graduateNext, setGraduateNext] = useState(false);
  const [reExplainDraft, setReExplainDraft] = useState('');
  // What the learner typed from memory before revealing. Never graded and
  // never stored: it exists so the definition lands against an actual
  // retrieval attempt instead of a blank stare, and so they can compare.
  const [attempt, setAttempt] = useState('');

  // queue[index] can be undefined once the session is complete. Every hook
  // below must still run in the same order on that render, so the "session
  // done" early return happens after all hooks, not before.
  const card = queue[index] as Card | undefined;
  const displayAnswer = edited?.answer ?? card?.answer ?? '';

  const mcData = useMemo(() => {
    if (!card || !displayAnswer.includes('|')) return null;
    const parts = displayAnswer.split('|').map(s => s.trim()).filter(Boolean);
    if (parts.length < 2) return null;

    const correct = parts[0];
    const shuffled = seededShuffle(parts, card.id);
    return { correct, options: shuffled, parts };
  }, [card, displayAnswer]);

  const isBoxZero = card?.box === 0;
  const displayPrompt = edited?.prompt ?? card?.prompt ?? '';
  // Vocab cards are term -> definition, so they get the write-then-reveal
  // flow. Multiple choice and cloze keep what they had.
  const isVocab = card?.type === 'vocab' && !mcData;

  // graduate: true intercepts the advance entirely and routes to the
  // re-explain stage instead - section 4's tier graduation happens in place
  // of moving to the next card, not after it.
  const advance = (direction: 'left' | 'right', opts?: { graduate?: boolean }) => {
    if (opts?.graduate) {
      setStage('re-explain');
      return;
    }
    setExitDirection(direction);
    setIsExiting(true);
    setTimeout(() => {
      setIndex((i) => i + 1);
      setStage('question');
      setEdited(null);
      setPicked(null);
      setGraduateNext(false);
      setReExplainDraft('');
      setAttempt('');
      setIsExiting(false);
      setExitDirection(null);
    }, 150);
  };

  const handleReveal = () => {
    // A vocab card reveals only after an actual attempt, so a stray Space
    // press can't hand over the definition before any retrieval happened.
    if (isVocab && !attempt.trim()) return;
    if (stage === 'question') setStage('answer');
  };

  const handleRate = async (correct: boolean) => {
    if (busy || !card) return;
    setBusy(true);
    const result = await submitReview(card.id, correct);
    setResults((prev) => [...prev, { card, correct }]);
    setBusy(false);
    if (correct) {
      advance('right', { graduate: 'readyToGraduate' in result && result.readyToGraduate });
    } else {
      setStage('wrong-feedback');
    }
  };

  const handlePick = async (option: string) => {
    if (picked !== null || busy || !card || !mcData) return;
    setPicked(option);
    const isCorrect = option === mcData.correct;
    setBusy(true);
    const result = await submitReview(card.id, isCorrect);
    setResults((prev) => [...prev, { card, correct: isCorrect }]);
    setBusy(false);
    setGraduateNext('readyToGraduate' in result && !!result.readyToGraduate);
    setStage('answer');
  };

  const handleGraduate = async () => {
    if (busy || !card || !reExplainDraft.trim()) return;
    setBusy(true);
    await graduateCard(card.id, reExplainDraft.trim());
    setBusy(false);
    advance('right');
  };

  const handleKeep = async () => {
    if (busy || !card) return;
    setBusy(true);
    await keepCard(card.id);
    setBusy(false);
    advance('right');
  };

  const handleDelete = async () => {
    if (busy || !card) return;
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
    if (busy || !card) return;
    setBusy(true);
    await updateCard(card.id, editDraft.prompt, editDraft.answer);
    setEdited({ prompt: editDraft.prompt, answer: editDraft.answer });
    setBusy(false);
    setStage('answer');
  };

  // This hook must run on every render, including the "session complete"
  // render where `card` is undefined — the early return below only happens
  // after every hook has already been called, per the Rules of Hooks.
  useEffect(() => {
    if (!card) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // A focused button (or the flip card's role="button" div) already
      // handles Enter/Space natively or via its own onKeyDown. Letting the
      // global shortcuts below also fire double-triggers the action - e.g.
      // Enter on a focused "Continue" button would call advance() twice in
      // a row and skip a card.
      if (['INPUT', 'TEXTAREA', 'BUTTON'].includes(target.tagName) || target.getAttribute('role') === 'button') return;

      if (e.key === ' ') {
        e.preventDefault();
        if (stage === 'question' && !mcData) {
          handleReveal();
        } else if (stage === 'wrong-feedback') {
          advance('left');
        } else if (stage === 'answer' && !mcData && !isBoxZero) {
           // Not doing anything for space on answer screen to avoid accidental rating
        }
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (stage === 'wrong-feedback') {
          advance('left');
        } else if (stage === 'answer' && isBoxZero && !mcData) {
          handleKeep();
        } else if (stage === 'answer' && mcData) {
          advance(picked === mcData.correct ? 'right' : 'left', { graduate: graduateNext });
        }
        return;
      }

      if (e.key === '1' && stage === 'answer' && !isBoxZero && !mcData) {
        handleRate(false); // Wrong
        return;
      }
      if (e.key === '2' && stage === 'answer' && !isBoxZero && !mcData) {
        handleRate(true); // Correct
        return;
      }

      if (mcData && stage === 'question' && /^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx >= 0 && idx < mcData.options.length) {
          handlePick(mcData.options[idx]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stage, card, mcData, isBoxZero, picked, graduateNext, advance, handleKeep, handlePick, handleRate, handleReveal]);

  if (!card) {
    return <CompletionScreen results={results} />;
  }

  return (
    <div className="min-h-screen bg-[#0a0908] text-white flex flex-col relative overflow-hidden">
      {/* Spring Progress Bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-white/5 z-50">
        <m.div 
          className="h-full bg-accent"
          initial={{ width: 0 }}
          animate={{ width: `${((index) / queue.length) * 100}%` }}
          transition={{ type: 'spring', stiffness: 60, damping: 15 }}
        />
      </div>

      <header className="flex justify-between items-center p-6 md:p-10 relative z-10">
        <Link href="/dashboard" className="text-gray-500 hover:text-white transition-colors flex items-center gap-2 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">
          <ArrowLeft className="w-5 h-5" aria-hidden="true" /> Dashboard
        </Link>
        <div className="text-[11px] font-bold tracking-wider text-gray-400 uppercase border border-white/10 rounded-full px-3 py-1 font-mono">
          Card {index + 1} of {queue.length}
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {!isExiting && (
              <m.div
                key={card.id}
                initial={{ opacity: 0, x: 0 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: exitDirection === 'left' ? -100 : exitDirection === 'right' ? 100 : 0 }}
                transition={{ duration: 0.15, ease: 'easeIn' }}
                className={`bg-[#14120f] p-8 md:p-12 rounded-3xl shadow-2xl relative ${
                  card.tier === 'imported' ? 'border-2 border-dashed border-white/10 opacity-80' : 'border-2 border-white/10'
                }`}
              >
                <div className="absolute top-4 left-4">
                  <BrainCircuit className="w-6 h-6 text-accent/30" aria-hidden="true" />
                </div>
                {isBoxZero && (
                  <div className="absolute top-4 right-4 text-[11px] font-bold tracking-wider text-accent uppercase">
                    New card
                  </div>
                )}

                <m.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.12, ease: 'easeOut' }}
                  className="min-h-[200px] flex flex-col justify-center items-center text-center"
                >
                  {stage === 're-explain' ? (
                    <div className="w-full text-left space-y-4">
                      <p className="text-sm text-gray-400">
                        You got this right twice in a row. Explain it in your own words to turn it into a card of your own.
                      </p>
                      <div>
                        <label htmlFor="re-explain" className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                          {displayPrompt}
                        </label>
                        <textarea
                          id="re-explain"
                          value={reExplainDraft}
                          onChange={(e) => setReExplainDraft(e.target.value)}
                          className="w-full bg-[#0a0908] border border-white/10 rounded-lg p-3 text-white font-serif resize-none focus:outline-none focus:border-accent/50"
                          rows={4}
                          placeholder="Explain this concept the way you'd tell a friend."
                          autoFocus
                        />
                      </div>
                    </div>
                  ) : stage === 'editing' ? (
                    <div className="w-full text-left space-y-4">
                      <div>
                        <label htmlFor="edit-prompt" className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
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
                        <label htmlFor="edit-answer" className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                          Answer
                        </label>
                        <textarea
                          id="edit-answer"
                          value={editDraft.answer}
                          onChange={(e) => setEditDraft((d) => ({ ...d, answer: e.target.value }))}
                          className="w-full bg-[#0a0908] border border-white/10 rounded-lg p-3 text-base md:text-sm text-white resize-none focus:outline-none focus:border-accent/50"
                          rows={2}
                        />
                      </div>
                    </div>
                  ) : isVocab ? (
                    /* Write from memory, then reveal. Same shape as the demo on
                       the landing page: term, attempt box, definition. The
                       reveal itself has no transition, per section 13. */
                    <div className="w-full text-left">
                      <h2 className="text-3xl md:text-4xl font-serif leading-snug text-white mb-6">{displayPrompt}</h2>

                      {stage === 'question' ? (
                        <>
                          <label htmlFor="recall-attempt" className="sr-only">
                            Type what you remember about {displayPrompt}
                          </label>
                          <textarea
                            id="recall-attempt"
                            name="attempt"
                            value={attempt}
                            onChange={(e) => setAttempt(e.target.value)}
                            onKeyDown={(e) => {
                              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                                e.preventDefault();
                                handleReveal();
                              }
                            }}
                            placeholder="Type what you remember..."
                            rows={4}
                            autoFocus
                            className="w-full bg-[#0a0908] border-2 border-white/10 rounded-xl p-4 text-base text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent resize-none"
                          />
                          <p className="mt-2 text-[11px] text-gray-400 font-mono tracking-widest uppercase hidden md:block">
                            Ctrl/Cmd + Enter to reveal
                          </p>
                        </>
                      ) : (
                        <div className="space-y-3">
                          {attempt.trim() && (
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                              <div className="text-[11px] font-mono uppercase tracking-widest text-gray-400 mb-1">You wrote</div>
                              <p className="text-sm md:text-base text-gray-300 whitespace-pre-wrap">{attempt}</p>
                            </div>
                          )}
                          <div className="bg-accent/10 border border-accent/30 rounded-xl p-4">
                            <div className="text-[11px] font-mono uppercase tracking-widest text-accent mb-1">Definition</div>
                            <p
                              className={`${flashcardTextSizeClass(displayAnswer, ['text-lg md:text-2xl', 'text-base md:text-xl', 'text-sm md:text-lg', 'text-xs md:text-base', 'text-[11px] md:text-sm'])} text-white leading-relaxed font-serif`}
                            >
                              {displayAnswer}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full flex flex-col items-center">
                      <h2 className="text-2xl md:text-3xl font-serif leading-relaxed text-center mb-8">{displayPrompt}</h2>
                      
                      {!mcData && stage !== 'question' && (
                        <div className="w-full pt-8 border-t border-white/10">
                          <p className="text-lg md:text-xl text-gray-300 font-light">{displayAnswer}</p>
                        </div>
                      )}

                      {mcData && (
                        <div className="grid grid-cols-1 gap-3 w-full" role="group" aria-label="Answer options">
                          {mcData.options.map((option, idx) => {
                            const isPicked = picked === option;
                            const isCorrectOption = option === mcData.correct;
                            const revealed = stage === 'answer' || stage === 'wrong-feedback';

                            let style = 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 border-2';
                            if (revealed && isCorrectOption) style = 'bg-green-500/15 border-green-500/40 text-green-300 border-2';
                            else if (revealed && isPicked) style = 'bg-red-500/15 border-red-500/40 text-red-300 border-2';
                            else if (revealed) style = 'bg-white/5 border-white/10 text-gray-500 border-2';

                            return (
                              <button
                                key={option}
                                onClick={() => handlePick(option)}
                                disabled={revealed}
                                className={`w-full flex items-center justify-between gap-3 px-6 py-4 rounded-xl text-left font-medium transition-all duration-200 disabled:cursor-default ${!revealed ? 'active:scale-[0.98]' : ''} ${style} focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2`}
                              >
                                <span className="flex items-center gap-3">
                                  <span className="text-xs font-mono opacity-50 bg-white/10 w-6 h-6 rounded-full flex items-center justify-center">{idx + 1}</span>
                                  {option}
                                </span>
                                {revealed && isCorrectOption && <Check className="w-5 h-5 flex-shrink-0 text-green-400" aria-hidden="true" />}
                                {revealed && isPicked && !isCorrectOption && <X className="w-5 h-5 flex-shrink-0 text-red-400" aria-hidden="true" />}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <AnimatePresence>
                        {(stage === 'answer' || stage === 'wrong-feedback') && picked !== null && picked !== mcData?.correct && card.explanation && (
                          <m.p
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="mt-6 text-sm text-gray-400 bg-white/5 border-2 border-white/10 rounded-xl p-5 w-full text-left"
                          >
                            <span className="font-bold text-gray-300 mb-1 block">Explanation:</span>
                            {card.explanation}
                          </m.p>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </m.div>
              </m.div>
            )}
          </AnimatePresence>

          <div className="mt-12 flex flex-col items-center gap-4 min-h-20 w-full">
            {stage === 'question' && !mcData && (
              <div className="flex flex-col items-center gap-2 w-full">
                <button
                  onClick={handleReveal}
                  disabled={isVocab && !attempt.trim()}
                  className={`w-full md:w-auto px-8 py-3.5 md:px-12 md:py-4 rounded-xl font-bold tracking-wide transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
                    isVocab
                      ? 'bg-accent text-[#0a0908] hover:brightness-110 active:scale-[0.98] disabled:bg-white/5 disabled:text-gray-500 disabled:cursor-not-allowed disabled:active:scale-100'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {isVocab ? 'Reveal the definition' : 'Show Answer'}
                </button>
                {!isVocab && (
                  <span className="text-[11px] text-gray-400 font-mono tracking-widest uppercase hidden md:block">Press Space</span>
                )}
              </div>
            )}

            {stage === 'question' && mcData && (
              <span className="text-[11px] text-gray-400 font-mono tracking-widest uppercase mt-4 hidden md:block">Press 1-{mcData.options.length} to select</span>
            )}
            {stage === 'answer' && mcData && (
              <div className="flex flex-col items-center gap-2">
                <m.button
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.1 }}
                  onClick={() => advance(picked === mcData.correct ? 'right' : 'left', { graduate: graduateNext })}
                  className="w-full sm:w-auto justify-center px-8 py-3.5 sm:px-12 sm:py-4 bg-accent hover:bg-accent/90 text-[#0a0908] rounded-xl font-bold tracking-wide transition-all active:scale-95 flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                >
                  Next question <ArrowRight className="w-4 h-4" />
                </m.button>
                <div className="text-[11px] text-gray-400 font-mono tracking-widest uppercase hidden md:block">Press Enter</div>
              </div>
            )}

            {stage === 'answer' && isBoxZero && (
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { staggerChildren: 0.03 } }}
                className="grid grid-cols-3 gap-3 w-full"
              >
                <m.button
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.1 } }}
                  onClick={handleKeep}
                  className="px-4 py-3 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-xl font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                >
                  Keep
                </m.button>
                <m.button
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.1 } }}
                  onClick={startEdit}
                  className="px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-xl font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                >
                  Edit
                </m.button>
                <m.button
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.1 } }}
                  onClick={handleDelete}
                  className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                >
                  Delete
                </m.button>
              </m.div>
            )}

            {stage === 'answer' && !isBoxZero && (
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { staggerChildren: 0.03 } }}
                className="grid grid-cols-2 gap-3 w-full"
              >
                <div className="flex flex-col gap-2">
                  <m.button
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.1 } }}
                    onClick={() => handleRate(false)}
                    className="px-6 py-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-bold transition-colors w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                  >
                    Wrong
                  </m.button>
                  <span className="text-[11px] text-gray-400 font-mono tracking-widest uppercase text-center hidden md:block">Press 1</span>
                </div>
                <div className="flex flex-col gap-2">
                  <m.button
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.1 } }}
                    onClick={() => handleRate(true)}
                    className="px-6 py-4 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-xl font-bold transition-colors w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                  >
                    Correct
                  </m.button>
                  <span className="text-[11px] text-gray-400 font-mono tracking-widest uppercase text-center hidden md:block">Press 2</span>
                </div>
              </m.div>
            )}

            {stage === 're-explain' && (
              <button
                onClick={handleGraduate}
                disabled={busy || !reExplainDraft.trim()}
                className="w-full md:w-auto px-8 py-3.5 md:px-12 md:py-4 bg-accent hover:bg-accent/90 text-[#0a0908] rounded-xl font-bold tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                Continue
              </button>
            )}

            {stage === 'editing' && (
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setStage('answer')}
                  className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  className="flex-1 px-6 py-3 bg-accent/20 hover:bg-accent/30 text-accent rounded-xl font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                >
                  Save
                </button>
              </div>
            )}

            {stage === 'wrong-feedback' && (
              <div className="flex flex-col items-center gap-3 w-full">
                <Link
                  href={`/notes/${card.note_id}?line=${card.line}`}
                  className="text-sm text-accent hover:text-accent-muted underline underline-offset-2 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                >
                  Jump to note
                </Link>
                <button
                  onClick={() => advance('left')}
                  className="w-full md:w-auto px-8 py-3.5 md:px-12 md:py-4 bg-white/10 hover:bg-white/20 rounded-xl font-bold tracking-wide transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
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
