import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Check, X, ArrowRight, BookOpen, RotateCcw } from 'lucide-react';
import { seededShuffle } from '@/lib/utils';

interface NoteCard {
  id: string;
  line: number;
  type: string;
  prompt: string;
  answer: string;
  explanation?: string | null;
}

interface PracticeTabProps {
  cards: NoteCard[];
}

export default function PracticeTab({ cards }: PracticeTabProps) {
  const [sessionCards, setSessionCards] = useState<NoteCard[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [stage, setStage] = useState<'start' | 'active' | 'results'>('start');

  const currentCard = sessionCards[index];
  const isQuiz = !!currentCard?.answer.includes('|');

  const options = useMemo(() => {
    if (!isQuiz || !currentCard?.answer) return { options: [], correct: '' };
    const parts = currentCard.answer.split('|').map(s => s.trim());
    const correct = parts[0];
    const shuffled = seededShuffle(parts, currentCard.id);
    return {
      options: shuffled,
      correct,
    };
  }, [currentCard, isQuiz]);

  // These must run on every render, including the start/results screens
  // below, whose early returns happen only after every hook has been
  // called — see the identical fix in ReviewSession.tsx for why.
  const handleNext = useCallback(() => {
    if (index + 1 < sessionCards.length) {
      setRevealed(false);
      setPicked(null);
      setIndex(index + 1);
    } else {
      setStage('results');
    }
  }, [index, sessionCards.length]);

  const handlePick = useCallback((option: string) => {
    if (revealed) return;
    setPicked(option);
    setRevealed(true);
  }, [revealed]);

  useEffect(() => {
    if (stage !== 'active') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input (though there shouldn't be one here)
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        if (revealed) handleNext();
        return;
      }
      if (e.key === ' ' || e.code === 'Space') {
        if (!isQuiz && !revealed) {
          e.preventDefault();
          setRevealed(true);
        }
        return;
      }
      if (isQuiz && !revealed && /^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx >= 0 && idx < options.options.length) {
          handlePick(options.options[idx]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stage, revealed, isQuiz, options, handleNext, handlePick]);

  if (cards.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <BookOpen className="w-12 h-12 text-gray-700 mb-4" aria-hidden="true" />
        <h3 className="text-xl font-serif text-gray-300 mb-2">No flashcards found</h3>
        <p className="text-gray-500 max-w-sm">
          Add some <code>**Vocab:**</code> / <code>**Def:**</code> or <code>**Quiz:**</code> / <code>**A:**</code> blocks in your notes to start practicing.
        </p>
      </div>
    );
  }

  if (stage === 'start') {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-lg w-full">
          <m.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent/10 mb-6 border border-accent/20"
          >
            <BookOpen className="w-10 h-10 text-accent" aria-hidden="true" />
          </m.div>
          <h2 className="text-3xl font-serif font-bold mb-4 text-white">Practice Mode</h2>
          <p className="text-gray-400 mb-8 text-lg">
            Review a random mix of up to 15 flashcards from this note. This is a local practice session and does not affect your spaced-repetition schedule.
          </p>
          <button
            onClick={() => {
              const shuffled = [...cards].sort(() => Math.random() - 0.5).slice(0, 15);
              setSessionCards(shuffled);
              setIndex(0);
              setRevealed(false);
              setPicked(null);
              setStage('active');
            }}
            className="px-8 py-4 bg-accent hover:bg-accent/90 text-white rounded-xl font-bold tracking-wide transition-colors"
          >
            Start Practice
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'results') {
    return (
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto custom-scrollbar">
        <m.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#14120f] border border-white/10 rounded-3xl p-10 max-w-lg w-full text-center shadow-2xl"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent/10 mb-6 border border-accent/20">
            <Check className="w-10 h-10 text-accent" aria-hidden="true" />
          </div>
          <h2 className="text-3xl font-serif font-bold mb-4 text-white">Practice Complete</h2>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-[#0a0908] p-4 rounded-2xl border border-white/5">
              <div className="text-3xl font-mono text-accent font-bold mb-1">{sessionCards.length}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider font-bold">Cards Reviewed</div>
            </div>
            <div className="bg-[#0a0908] p-4 rounded-2xl border border-white/5">
              <div className="text-3xl font-mono text-gray-300 font-bold mb-1">0</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider font-bold">New Cards Due</div>
            </div>
          </div>

          <button
            onClick={() => {
              setStage('start');
            }}
            className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold tracking-wide transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Practice Again
          </button>
        </m.div>
      </div>
    );
  }

  const isCorrect = isQuiz ? picked === options.correct : true;

  return (
    <div className="flex-1 flex flex-col p-6 md:p-10 overflow-y-auto custom-scrollbar relative">
      {/* Spring Progress Bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
        <m.div 
          className="h-full bg-accent"
          initial={{ width: 0 }}
          animate={{ width: `${((index) / sessionCards.length) * 100}%` }}
          transition={{ type: 'spring', stiffness: 60, damping: 15 }}
        />
      </div>

      <div className="flex justify-center mb-6 shrink-0 mt-2">
        <span className="text-[10px] font-bold tracking-wider text-gray-600 uppercase border border-white/10 rounded-full px-3 py-1 font-mono">
          {index + 1} / {sessionCards.length}
        </span>
      </div>

      <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col items-center">
        {!isQuiz ? (
          // 3D Flip Card for Vocab/Cloze
          <div className="relative w-full aspect-[4/3] md:aspect-[21/9] mb-8" style={{ perspective: '1000px' }}>
            <m.div
              key={currentCard.id}
              className="w-full h-full relative cursor-pointer"
              style={{ transformStyle: 'preserve-3d' }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, rotateY: revealed ? 180 : 0 }}
              transition={{ 
                opacity: { duration: 0.2 },
                y: { duration: 0.2 },
                rotateY: { type: 'spring', stiffness: 200, damping: 20 }
              }}
              onClick={() => setRevealed(true)}
            >
              {/* Front */}
              <div 
                className="absolute inset-0 bg-[#0a0908] border border-white/10 p-8 md:p-12 rounded-3xl shadow-2xl flex flex-col items-center justify-center text-center"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <h2 className="text-xl md:text-3xl font-serif leading-relaxed text-white">{currentCard.prompt}</h2>
                {!revealed && (
                  <p className="absolute bottom-6 text-xs text-gray-600 font-mono tracking-widest uppercase">Click to flip</p>
                )}
              </div>
              {/* Back */}
              <div 
                className="absolute inset-0 bg-[#14120f] border border-white/10 p-8 md:p-12 rounded-3xl shadow-2xl flex flex-col items-center justify-center text-center"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <p className="text-lg md:text-2xl text-gray-300 leading-relaxed font-serif">{currentCard.answer}</p>
              </div>
            </m.div>
          </div>
        ) : (
          // Standard Card for Quiz
          <m.div
            key={currentCard.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="w-full bg-[#0a0908] border border-white/10 p-8 md:p-12 rounded-3xl shadow-2xl mb-8"
          >
            <h2 className="text-xl md:text-2xl font-serif leading-relaxed text-center text-white">{currentCard.prompt}</h2>
          </m.div>
        )}

        {isQuiz && (
          <div className="grid grid-cols-1 gap-3 w-full" role="group" aria-label="Answer options">
            {options.options.map((option) => {
              const isPicked = picked === option;
              const isCorrectOption = option === options.correct;

              let style = 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300';
              if (revealed && isCorrectOption) style = 'bg-green-500/15 border-green-500/40 text-green-300';
              else if (revealed && isPicked) style = 'bg-red-500/15 border-red-500/40 text-red-300';
              else if (revealed) style = 'bg-white/5 border-white/10 text-gray-500';

              return (
                <button
                  key={option}
                  onClick={() => handlePick(option)}
                  disabled={revealed}
                  className={`w-full flex items-center justify-between gap-3 px-6 py-4 border rounded-xl text-left font-medium transition-colors disabled:cursor-default ${style}`}
                >
                  <span>{option}</span>
                  {revealed && isCorrectOption && <Check className="w-4 h-4 flex-shrink-0" aria-hidden="true" />}
                  {revealed && isPicked && !isCorrectOption && <X className="w-4 h-4 flex-shrink-0" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        )}

        <AnimatePresence>
          {revealed && currentCard.explanation && (!isQuiz || !isCorrect) && (
            <m.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="mt-4 text-sm text-gray-400 bg-white/5 border border-white/10 rounded-xl p-4 w-full"
            >
              {currentCard.explanation}
            </m.p>
          )}
        </AnimatePresence>

        <div className="mt-8 flex flex-col items-center min-h-[5rem] gap-2">
          {revealed ? (
            <>
              <m.button
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.1 }}
                onClick={handleNext}
                className="px-12 py-4 bg-white/10 hover:bg-white/20 rounded-xl font-bold tracking-wide transition-all flex items-center gap-2"
              >
                {index + 1 < sessionCards.length ? 'Next card' : 'Finish'}
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </m.button>
              <div className="text-[10px] text-gray-600 font-mono tracking-widest uppercase">Press Enter</div>
            </>
          ) : (
            <div className="text-[10px] text-gray-600 font-mono tracking-widest uppercase mt-4">
              {isQuiz ? 'Press 1-4 to pick an answer' : 'Press Space to flip'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
