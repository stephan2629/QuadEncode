'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Brain, Check, X, RotateCw, RotateCcw, Sparkles, ArrowRight, Zap } from 'lucide-react';
import { saveMissedQuestionsAction } from '@/app/actions/quiz-actions';
import { parseLocalQuiz, type QuizQuestion } from '@/lib/quiz-parser';

interface AnsweredQuestion {
  question: QuizQuestion;
  picked: string;
  correct: boolean;
}

type Stage = 'idle' | 'loading' | 'playing' | 'results';

// A quiz in progress (stage 'playing') is saved here so a tab refresh
// resumes the same question/score instead of losing it. Cleared once the
// session leaves 'playing' - completion or an explicit reset - so a stale
// session never comes back after that point.
interface StoredQuizSession {
  stage: Stage;
  questions: QuizQuestion[];
  index: number;
  picked: string | null;
  answered: AnsweredQuestion[];
}

function sessionStorageKey(noteId: string) {
  return `quiz-session-${noteId}`;
}

export default function QuizTab({
  noteId,
  content,
}: {
  noteId: string;
  content: string;
}) {
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [answered, setAnswered] = useState<AnsweredQuestion[]>([]);
  const [convertedCount, setConvertedCount] = useState<number | null>(null);

  // Resume a saved in-progress session once, after mount (sessionStorage
  // isn't available during SSR, so reading it any earlier would produce a
  // hydration mismatch - same reasoning as this repo's useSessionStorage
  // hook, just inlined here since this component saves several fields as
  // one combined object rather than one hook call per field).
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(sessionStorageKey(noteId));
      if (!raw) return;
      const stored = JSON.parse(raw) as StoredQuizSession;
      if (stored.stage === 'playing' && stored.questions.length > 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setQuestions(stored.questions);
        setIndex(stored.index);
        setPicked(stored.picked);
        setAnswered(stored.answered);
        setStage('playing');
      }
    } catch (error) {
      console.warn('Error reading quiz session from sessionStorage:', error);
    }
    // Only the initial read on mount belongs here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirrors the active session to sessionStorage while playing, and clears
  // it the moment play stops for any reason (results reached, reset, or
  // back to idle) so a finished or abandoned session never gets resumed.
  useEffect(() => {
    const key = sessionStorageKey(noteId);
    try {
      if (stage === 'playing') {
        const session: StoredQuizSession = { stage, questions, index, picked, answered };
        window.sessionStorage.setItem(key, JSON.stringify(session));
      } else {
        window.sessionStorage.removeItem(key);
      }
    } catch (error) {
      console.warn('Error saving quiz session to sessionStorage:', error);
    }
  }, [noteId, stage, questions, index, picked, answered]);

  const current = questions[index];
  const missed = useMemo(() => answered.filter((a) => !a.correct).map((a) => a.question), [answered]);
  const score = answered.filter((a) => a.correct).length;

  const startSession = (built: QuizQuestion[]) => {
    if (built.length === 0) {
      setError("No quiz or vocab cards found in this note. Write some or use the AI Generator.");
      return;
    }
    setQuestions(built);
    setIndex(0);
    setPicked(null);
    setAnswered([]);
    setConvertedCount(null);
    setStage('playing');
  };

  // Explicit "Start over" (skill requirement: a way to manually purge local
  // session state), distinct from finishing normally - abandons the current
  // session mid-way rather than completing it.
  const handleReset = () => {
    try {
      window.sessionStorage.removeItem(sessionStorageKey(noteId));
    } catch (error) {
      console.warn('Error clearing quiz session from sessionStorage:', error);
    }
    setStage('idle');
    setQuestions([]);
    setIndex(0);
    setPicked(null);
    setAnswered([]);
  };

  const handleStartLocal = () => {
    setError(null);
    const parsed = parseLocalQuiz(content);
    
    const explicitQuizzes = parsed.filter(q => q.type === 'quiz');
    const vocabs = parsed.filter(q => q.type === 'vocab');
    const vocabDefs = vocabs.map(v => v.correct);
    
    const vocabQuizzes: QuizQuestion[] = vocabs.map(v => {
      const distractors = vocabDefs.filter(d => d !== v.correct).sort(() => 0.5 - Math.random()).slice(0, 3);
      const fallback = ["Not enough context provided.", "None of the above.", "All of the above.", "A concept related to the current topic."];
      let i = 0;
      while (distractors.length < 3 && i < fallback.length) {
        if (!distractors.includes(fallback[i]) && v.correct !== fallback[i]) {
          distractors.push(fallback[i]);
        }
        i++;
      }
      return {
        ...v,
        type: 'quiz',
        options: [v.correct, ...distractors].sort(() => 0.5 - Math.random())
      };
    });
    
    let allQuestions = [...explicitQuizzes, ...vocabQuizzes];
    
    if (allQuestions.length > 10) {
      allQuestions = allQuestions.sort(() => 0.5 - Math.random()).slice(0, 10);
    }
    startSession(allQuestions);
  };

  const handlePick = useCallback((option: string) => {
    if (picked !== null || !current) return;
    setPicked(option);
  }, [picked, current]);

  const handleContinue = useCallback(() => {
    if (!current || picked === null) return;
    setAnswered((prev) => [...prev, { question: current, picked, correct: picked === current.correct }]);
    setPicked(null);
    if (index + 1 < questions.length) {
      setIndex((i) => i + 1);
    } else {
      setStage('results');
    }
  }, [current, picked, questions.length, index]);

  useEffect(() => {
    if (stage !== 'playing' || !current) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        if (picked !== null) handleContinue();
        return;
      }
      
      if (picked === null && /^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (current.options && idx >= 0 && idx < current.options.length) {
          handlePick(current.options[idx]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stage, current, picked, handleContinue, handlePick]);

  const handleConvertMissed = async () => {
    if (missed.length === 0) return;
    const res = await saveMissedQuestionsAction(noteId, content, missed);
    if (res.success) {
      setConvertedCount(missed.length);
    } else {
      setError("Failed to convert missed questions.");
    }
  };

  if (stage === 'loading') {
    return (
      <div key="loading" className="flex-1 flex flex-col items-center justify-center p-12 text-center h-full min-h-[400px]">
        <m.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center border border-accent/50 mb-6"
        >
          <Brain className="w-8 h-8 text-accent" aria-hidden="true" />
        </m.div>
        <h2 className="text-xl font-bold font-serif text-white mb-2">Reading your notes</h2>
        <p className="text-gray-400 text-sm">Writing questions from what you&apos;ve written.</p>
      </div>
    );
  }

  if (stage === 'playing' && current) {
    const revealed = picked !== null;
    const isCorrect = picked === current.correct;

    return (
      <div key="playing" className="flex-1 flex flex-col p-6 md:p-10 overflow-y-auto custom-scrollbar relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
          <m.div
            className="h-full bg-accent"
            initial={{ width: 0 }}
            animate={{ width: `${((index) / questions.length) * 100}%` }}
            transition={{ type: 'spring', stiffness: 60, damping: 15 }}
          />
        </div>

        <div className="flex items-center justify-center gap-3 mb-6 shrink-0 mt-2">
          <span className="text-[11px] font-bold tracking-wider text-gray-400 uppercase border border-white/10 rounded-full px-3 py-1 font-mono">
            {index + 1} / {questions.length}
          </span>
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-[11px] font-bold tracking-wider text-gray-400 hover:text-gray-300 uppercase transition-colors"
          >
            <RotateCcw className="w-3 h-3" aria-hidden="true" /> Start over
          </button>
        </div>

        {/* my-auto, not justify-center on the scroll container: centering via
            flex justify-content on an overflowing container clips content at
            the top with no way to scroll back up to it — a long question
            plus its options can grow past both the top and bottom of the
            viewport, taking the Next button with it. margin:auto centers
            this block only while it fits; once it's taller than the
            available space it falls back to a normal top-aligned flow that
            the container's overflow-y-auto can always reach. */}
        <div className="w-full max-w-2xl mx-auto my-auto flex flex-col items-center">
            <m.div
              key={current.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              className="w-full bg-[#0a0908] border border-white/10 p-12 md:p-16 rounded-3xl shadow-2xl mb-8"
            >
              <h4 className="text-xl md:text-2xl font-serif leading-relaxed text-center text-white">{current.prompt}</h4>
            </m.div>

            <div className="grid grid-cols-1 gap-3 w-full" role="group" aria-label="Answer options">
              {current.options?.map((option) => {
                const isPicked = picked === option;
                const isCorrectOption = option === current.correct;

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

            <AnimatePresence>
              {revealed && current.explanation && !isCorrect && (
                <m.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="w-full mt-4 bg-white/5 border border-white/10 p-4 rounded-xl text-gray-300 text-sm overflow-hidden"
                >
                  <span className="font-bold text-accent mr-2">Explanation:</span>
                  {current.explanation}
                </m.div>
              )}
            </AnimatePresence>

          <div className="mt-12 flex flex-col items-center min-h-[5rem] gap-2">

            {revealed && (
              <>
                <m.button
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.1 }}
                  onClick={handleContinue}
                  className="w-full sm:w-auto justify-center px-8 py-3.5 sm:px-12 sm:py-4 bg-white/10 hover:bg-white/20 rounded-xl font-bold tracking-wide transition-all flex items-center gap-2"
                >
                  {index + 1 < questions.length ? 'Next question' : 'See results'}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </m.button>
                <div className="text-[11px] text-gray-400 font-mono tracking-widest uppercase hidden md:block">Press Enter</div>
              </>
            )}
            {!revealed && current.type === 'quiz' && (
              <div className="text-[11px] text-gray-400 font-mono tracking-widest uppercase mt-4 hidden md:block">Press 1-{current.options?.length} to pick an answer</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'results') {
    const total = answered.length;
    return (
      <div key="results" className="flex-1 flex items-center justify-center p-6 overflow-y-auto custom-scrollbar">
        <div className="text-center max-w-xl w-full py-10">
          <m.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent/10 mb-6 border border-accent/20"
          >
            <Sparkles className="w-10 h-10 text-accent" aria-hidden="true" />
          </m.div>
          <h2 className="text-3xl font-serif font-bold mb-6 text-white">Quiz complete</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-[#0a0908] p-4 rounded-2xl border border-white/5">
              <div className="text-3xl font-mono text-accent font-bold mb-1">{score}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wider font-bold">Correct</div>
            </div>
            <div className="bg-[#0a0908] p-4 rounded-2xl border border-white/5">
              <div className="text-3xl font-mono text-red-400 font-bold mb-1">{total - score}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wider font-bold">Missed</div>
            </div>
          </div>

          <div className="text-left bg-[#14120f] border border-white/10 rounded-2xl p-5 mb-8 space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Every question</h3>
            {answered.map((a, i) => (
              <div key={i} className="border-b border-white/5 last:border-0 pb-3 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-gray-200">{a.question.prompt}</p>
                  {a.correct ? (
                    <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  ) : (
                    <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  )}
                </div>
                {!a.correct && (
                  <p className="text-xs text-gray-500 mt-1">
                    You picked <span className="text-red-400">{a.picked}</span>. Correct: <span className="text-green-400">{a.question.correct}</span>.
                  </p>
                )}
              </div>
            ))}
          </div>

          {missed.length > 0 && convertedCount === null && (
            <button
              onClick={handleConvertMissed}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-full font-medium transition-all active:scale-95 mb-4"
            >
              Turn {missed.length} missed {missed.length === 1 ? 'question' : 'questions'} into Box 0 cards
            </button>
          )}
          {convertedCount !== null && (
            <p className="text-accent text-sm mb-4">
              Added {convertedCount} vocab {convertedCount === 1 ? 'card' : 'cards'} to this note.
            </p>
          )}

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleStartLocal}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-full font-medium transition-all active:scale-95"
            >
              <RotateCw className="w-4 h-4" aria-hidden="true" /> Play again
            </button>
            <button
              onClick={() => setStage('idle')}
              className="text-gray-400 hover:text-white px-6 py-3 rounded-full font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  const localQuestionsCount = Math.min(parseLocalQuiz(content).length, 10);

  return (
    <div key="idle" className="flex-1 flex flex-col items-center justify-center p-12 text-center h-full">
      <div className="bg-accent/10 w-20 h-20 rounded-full flex items-center justify-center mb-6 border border-accent/20">
        <Brain className="w-10 h-10 text-accent" aria-hidden="true" />
      </div>
      <h2 className="text-3xl font-bold font-serif text-white mb-4">Quiz yourself</h2>
      <p className="text-gray-400 max-w-md mx-auto mb-8 text-sm">
        Start a quiz directly from your notes.
      </p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 max-w-md text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col items-center gap-4 w-full max-w-sm">
        <button
          onClick={handleStartLocal}
          className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-[#0a0908] font-bold px-8 py-4 rounded-xl active:scale-95 transition-all"
        >
          <Zap className="w-5 h-5" aria-hidden="true" />
          Start Quiz ({localQuestionsCount} questions)
        </button>

        {/* The AI generation button used to live here. It moved to the
            Notes tab (GenerateCardsButton.tsx): this tab only appears once
            a note already holds 10+ quiz or vocab pairs, so keeping the
            control that creates them behind that gate would have made the
            threshold impossible to cross from an empty note. */}
      </div>
    </div>
  );
}
