import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Check, ArrowRight, ArrowLeft, BookOpen, RotateCcw } from 'lucide-react';
import { parseLocalQuiz } from '@/lib/quiz-parser';

interface NoteCard {
  id: string;
  line: number;
  type: string;
  prompt: string;
  answer: string;
  explanation?: string | null;
}

interface ClozeCard {
  line: number;
  prompt: string;
  answer: string;
}

interface PracticeTabProps {
  content: string;
  clozeCards?: ClozeCard[];
  // Optional so this component still renders standalone in tests without a
  // real note - falls back to a fixed key, which just means those callers
  // share one session slot instead of a per-note one.
  noteId?: string;
}

// An in-progress flashcard session (stage 'active') is saved here so a tab
// refresh resumes the same card/position instead of losing it. Cleared once
// the session leaves 'active' - finished or reset - so a stale session
// never comes back after that point.
interface StoredPracticeTabSession {
  stage: 'active';
  sessionCards: NoteCard[];
  index: number;
  revealed: boolean;
}

function sessionStorageKey(noteId: string) {
  return `practice-tab-session-${noteId}`;
}

export default function PracticeTab({ content, clozeCards = [], noteId = 'unknown' }: PracticeTabProps) {
  // Cmd+K cloze cards live in separate component state, not the note body
  // markdown, so parseLocalQuiz (which only reads **Vocab:**/**Quiz:**
  // blanks) can't see them - merge them in here or they silently vanish
  // from practice.
  const cards = useMemo(() => {
    const fromBlanks: NoteCard[] = parseLocalQuiz(content)
      .filter(q => q.type === 'vocab')
      .map(q => ({
        id: q.id,
        line: q.originalLine,
        type: 'vocab',
        prompt: q.prompt,
        answer: q.correct,
        explanation: q.explanation
      }));
    const fromCloze: NoteCard[] = clozeCards.map((c) => ({
      id: `cloze-${c.line}`,
      line: c.line,
      type: 'cloze',
      prompt: c.prompt,
      answer: c.answer,
      explanation: null,
    }));
    return [...fromBlanks, ...fromCloze];
  }, [content, clozeCards]);

  const [sessionCards, setSessionCards] = useState<NoteCard[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [stage, setStage] = useState<'start' | 'active' | 'results'>('start');

  // Resume a saved in-progress session once, after mount (sessionStorage
  // isn't available during SSR, so reading it any earlier would produce a
  // hydration mismatch - same reasoning as this repo's useSessionStorage
  // hook).
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(sessionStorageKey(noteId));
      if (!raw) return;
      const stored = JSON.parse(raw) as StoredPracticeTabSession;
      if (stored.stage === 'active' && stored.sessionCards.length > 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSessionCards(stored.sessionCards);
        setIndex(stored.index);
        setRevealed(stored.revealed);
        setStage('active');
      }
    } catch (error) {
      console.warn('Error reading practice session from sessionStorage:', error);
    }
    // Only the initial read on mount belongs here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirrors the active session to sessionStorage while it's under way, and
  // clears it the moment it stops for any reason (finished, reset, or back
  // to start) so a completed or abandoned session never gets resumed.
  useEffect(() => {
    const key = sessionStorageKey(noteId);
    try {
      if (stage === 'active') {
        const session: StoredPracticeTabSession = { stage, sessionCards, index, revealed };
        window.sessionStorage.setItem(key, JSON.stringify(session));
      } else {
        window.sessionStorage.removeItem(key);
      }
    } catch (error) {
      console.warn('Error saving practice session to sessionStorage:', error);
    }
  }, [noteId, stage, sessionCards, index, revealed]);

  // Explicit "Start over" (skill requirement: a way to manually purge local
  // session state), distinct from finishing normally - abandons the
  // current session mid-way rather than completing it.
  const handleReset = () => {
    try {
      window.sessionStorage.removeItem(sessionStorageKey(noteId));
    } catch (error) {
      console.warn('Error clearing practice session from sessionStorage:', error);
    }
    setStage('start');
    setSessionCards([]);
    setIndex(0);
    setRevealed(false);
  };

  const currentCard = sessionCards[index];
  // Section 6: graded review shows term-then-definition, but Practice mode
  // is deliberately reversed - definition first, term on the back - so
  // recall is tested by "what's this called" rather than "what's the
  // definition of X" (the same card asked the other, less useful way for
  // practice). Cloze cards have no term/definition shape to reverse, so
  // only vocab cards flip.
  const isVocabCard = currentCard?.type === 'vocab';
  const frontText = isVocabCard ? currentCard.answer : currentCard?.prompt;
  const backText = isVocabCard ? currentCard.prompt : currentCard?.answer;

  const handleNext = useCallback(() => {
    if (index + 1 < sessionCards.length) {
      setRevealed(false);
      setIndex(index + 1);
    } else {
      setStage('results');
    }
  }, [index, sessionCards.length]);

  const handlePrevious = useCallback(() => {
    if (index > 0) {
      setRevealed(false);
      setIndex(index - 1);
    }
  }, [index]);

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
        if (!revealed) {
          e.preventDefault();
          setRevealed(true);
        }
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stage, revealed, handleNext, handlePrevious]);

  if (cards.length === 0) {
    return (
      <div key="empty" className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <BookOpen className="w-12 h-12 text-gray-700 mb-4" aria-hidden="true" />
        <h3 className="text-xl font-serif text-gray-300 mb-2">No flashcards found</h3>
        <p className="text-gray-500 max-w-sm">
          Add some <code>**Vocab:**</code> / <code>**Def:**</code> blocks in your notes to start practicing.
        </p>
      </div>
    );
  }

  if (stage === 'start') {
    return (
      <div key="start" className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-lg w-full">
          <m.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent/10 mb-6 border border-accent/20"
          >
            <BookOpen className="w-10 h-10 text-accent" aria-hidden="true" />
          </m.div>
          <h2 className="text-3xl font-serif font-bold mb-4 text-white">Practice mode</h2>
          <p className="text-gray-400 mb-8 text-lg">
            Review a practice set of {Math.min(cards.length, 10)} flashcard{Math.min(cards.length, 10) === 1 ? '' : 's'} from this note. This is a local practice session and does not affect your spaced-repetition schedule.
          </p>
          <button
            onClick={() => {
              const shuffled = [...cards].sort(() => Math.random() - 0.5).slice(0, 10);
              setSessionCards(shuffled);
              setIndex(0);
              setRevealed(false);
              setStage('active');
            }}
            className="w-full sm:w-auto px-6 py-3.5 sm:px-8 sm:py-4 bg-accent hover:bg-accent/90 text-white rounded-xl font-bold tracking-wide transition-colors"
          >
            Start practice
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'results') {
    return (
      <div key="results" className="flex-1 flex items-center justify-center p-6 overflow-y-auto custom-scrollbar">
        <m.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#14120f] border border-white/10 rounded-3xl p-10 max-w-lg w-full text-center shadow-2xl"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent/10 mb-6 border border-accent/20">
            <Check className="w-10 h-10 text-accent" aria-hidden="true" />
          </div>
          <h2 className="text-3xl font-serif font-bold mb-4 text-white">Practice complete</h2>
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
            <RotateCcw className="w-4 h-4" /> Practice again
          </button>
        </m.div>
      </div>
    );
  }

  return (
    <div key="active" className="flex-1 flex flex-col p-6 md:p-10 overflow-y-auto custom-scrollbar relative">
      {/* Spring Progress Bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
        <m.div 
          className="h-full bg-accent"
          initial={{ width: 0 }}
          animate={{ width: `${((index) / sessionCards.length) * 100}%` }}
          transition={{ type: 'spring', stiffness: 60, damping: 15 }}
        />
      </div>

      <div className="flex items-center justify-center gap-3 mb-6 shrink-0 mt-2">
        <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase border border-white/10 rounded-full px-3 py-1 font-mono">
          {index + 1} / {sessionCards.length}
        </span>
        <button
          onClick={handleReset}
          className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-gray-500 hover:text-gray-300 uppercase transition-colors"
        >
          <RotateCcw className="w-3 h-3" aria-hidden="true" /> Start over
        </button>
      </div>

      <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col items-center">
        <div className="relative w-full aspect-[4/3] md:aspect-[21/9] mb-8" style={{ perspective: '2000px' }}>
          <m.div
            key={currentCard.id}
            role="button"
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
            <div 
              className="absolute inset-0 bg-white/5 backdrop-blur-md border border-white/10 p-12 md:p-16 rounded-3xl shadow-2xl flex flex-col items-center justify-center text-center hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] transition-shadow duration-300"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="overflow-y-auto w-full custom-scrollbar flex flex-col items-center justify-center h-full">
                {currentCard.explanation && (
                  <p className="text-sm md:text-base text-gray-400 font-serif italic mb-4 max-w-xl mx-auto">&quot;{currentCard.explanation}&quot;</p>
                )}
                <p className="text-xl md:text-3xl font-serif leading-relaxed text-white">{frontText}</p>
              </div>
              {!revealed && (
                <p className="absolute bottom-6 text-xs text-gray-600 font-mono tracking-widest uppercase">Click to flip</p>
              )}
            </div>
            <div
              className="absolute inset-0 bg-white/5 backdrop-blur-md border border-white/10 p-12 md:p-16 rounded-3xl shadow-2xl flex flex-col items-center justify-center text-center hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] transition-shadow duration-300"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <p className="text-lg md:text-2xl text-gray-300 leading-relaxed font-serif">{backText}</p>
            </div>
          </m.div>
        </div>

        <AnimatePresence>
          {revealed && currentCard.explanation && (
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

        <div className="mt-12 flex flex-col items-center min-h-[5rem] gap-2">
          {revealed ? (
            <>
              <div className="flex gap-3 sm:gap-4 w-full sm:w-auto">
                <m.button
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.1 }}
                  onClick={handlePrevious}
                  disabled={index === 0}
                  className="flex-1 sm:flex-none justify-center px-4 py-3.5 sm:px-6 sm:py-4 bg-white/5 hover:bg-white/10 rounded-xl font-bold tracking-wide transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                  Previous
                </m.button>
                <m.button
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.1 }}
                  onClick={handleNext}
                  className="flex-1 sm:flex-none justify-center px-6 py-3.5 sm:px-12 sm:py-4 bg-accent hover:bg-accent/90 text-[#0a0908] rounded-xl font-bold tracking-wide transition-all flex items-center gap-2"
                >
                  {index + 1 < sessionCards.length ? 'Next card' : 'Finish'}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </m.button>
              </div>
              <div className="text-[10px] text-gray-400 font-mono tracking-widest uppercase mt-2 hidden md:block">Arrow keys to navigate</div>
            </>
          ) : (
            <div className="text-[10px] text-gray-400 font-mono tracking-widest uppercase mt-4 hidden md:block">
              Press Space to flip
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
