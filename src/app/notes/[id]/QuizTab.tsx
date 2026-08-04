'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Brain, Check, X, RotateCw, Sparkles, ArrowRight, Zap } from 'lucide-react';
import { generateAIQuizAction, saveMissedQuestionsAction, type QuizQuotaInfo } from '@/app/actions/quiz-actions';
import { parseLocalQuiz, type QuizQuestion } from '@/lib/quiz-parser';

interface AnsweredQuestion {
  question: QuizQuestion;
  picked: string;
  correct: boolean;
}

type Stage = 'idle' | 'loading' | 'playing' | 'results';

function hoursUntilReset(resetAtIso: string): number {
  const resetAt = new Date(resetAtIso).getTime() + 24 * 60 * 60 * 1000;
  return Math.max(1, Math.ceil((resetAt - Date.now()) / (60 * 60 * 1000)));
}

export default function QuizTab({
  noteId,
  content,
  quota: initialQuota,
}: {
  noteId: string;
  content: string;
  quota: QuizQuotaInfo;
}) {
  const [stage, setStage] = useState<Stage>('idle');
  const [quota, setQuota] = useState(initialQuota);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [answered, setAnswered] = useState<AnsweredQuestion[]>([]);
  const [convertedCount, setConvertedCount] = useState<number | null>(null);

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

  const handleStartLocal = () => {
    setError(null);
    startSession(parseLocalQuiz(content));
  };

  const handleGenerateAI = async () => {
    if (!content || content.trim().length < 20) {
      setError('Add some notes first so there is material to quiz you on.');
      return;
    }
    setError(null);
    setStage('loading');

    const res = await generateAIQuizAction(noteId, content);
    if (!res.success) {
      setError(res.error || 'Failed to generate quiz');
      setStage('idle');
      return;
    }

    if (typeof res.remaining === 'number') {
      setQuota((q) => ({ ...q, used: q.limit - res.remaining!, remaining: res.remaining! }));
    }

    const updatedContent = content + '\n\n' + res.appendedText;
    const localQuestions = parseLocalQuiz(updatedContent);
    startSession(localQuestions);
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
        if (idx >= 0 && idx < current.options.length) {
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
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center h-full min-h-[400px]">
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
      <div className="flex-1 flex flex-col p-6 md:p-10 overflow-y-auto custom-scrollbar relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
          <m.div 
            className="h-full bg-accent"
            initial={{ width: 0 }}
            animate={{ width: `${((index) / questions.length) * 100}%` }}
            transition={{ type: 'spring', stiffness: 60, damping: 15 }}
          />
        </div>

        <div className="flex justify-center mb-6 shrink-0 mt-2">
          <span className="text-[10px] font-bold tracking-wider text-gray-600 uppercase border border-white/10 rounded-full px-3 py-1 font-mono">
            {index + 1} / {questions.length}
          </span>
        </div>

        <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col justify-center">
          <m.div
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="bg-[#0a0908] border border-white/10 p-8 md:p-12 rounded-3xl shadow-2xl mb-8"
          >
            <h2 className="text-xl md:text-2xl font-serif leading-relaxed text-center text-white">{current.prompt}</h2>
          </m.div>

          <div className="grid grid-cols-1 gap-3" role="group" aria-label="Answer options">
            {current.options.map((option) => {
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
            {revealed && !isCorrect && current.explanation && (
              <m.p
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="mt-4 text-sm text-gray-400 bg-white/5 border border-white/10 rounded-xl p-4"
              >
                {current.explanation}
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
                  onClick={handleContinue}
                  className="px-12 py-4 bg-white/10 hover:bg-white/20 rounded-xl font-bold tracking-wide transition-all flex items-center gap-2"
                >
                  {index + 1 < questions.length ? 'Next question' : 'See results'}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </m.button>
                <div className="text-[10px] text-gray-600 font-mono tracking-widest uppercase">Press Enter</div>
              </>
            ) : (
              <div className="text-[10px] text-gray-600 font-mono tracking-widest uppercase mt-4">Press 1-{current.options.length} to pick an answer</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'results') {
    const total = answered.length;
    return (
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto custom-scrollbar">
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
              <div className="text-xs text-gray-500 uppercase tracking-wider font-bold">Correct</div>
            </div>
            <div className="bg-[#0a0908] p-4 rounded-2xl border border-white/5">
              <div className="text-3xl font-mono text-red-400 font-bold mb-1">{total - score}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider font-bold">Missed</div>
            </div>
          </div>

          <div className="text-left bg-[#14120f] border border-white/10 rounded-2xl p-5 mb-8 space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Every question</h3>
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

  const quotaExhausted = quota.remaining <= 0;
  const localQuestionsCount = parseLocalQuiz(content).length;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center h-full">
      <div className="bg-accent/10 w-20 h-20 rounded-full flex items-center justify-center mb-6 border border-accent/20">
        <Brain className="w-10 h-10 text-accent" aria-hidden="true" />
      </div>
      <h2 className="text-3xl font-bold font-serif text-white mb-4">Quiz yourself</h2>
      <p className="text-gray-400 max-w-md mx-auto mb-8 text-sm">
        Start a zero-token local quiz directly from your notes, or generate a fresh AI quiz.
      </p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 max-w-md text-sm">
          {error}
        </div>
      )}

      {quotaExhausted && (
        <div className="bg-white/5 border border-white/10 text-gray-400 px-4 py-3 rounded-xl mb-6 max-w-md text-sm">
          You&apos;ve used both AI quizzes for today. More in about {hoursUntilReset(quota.resetAt)}{' '}
          {hoursUntilReset(quota.resetAt) === 1 ? 'hour' : 'hours'}.
        </div>
      )}

      <div className="flex flex-col items-center gap-4 w-full max-w-sm">
        <button
          onClick={handleStartLocal}
          className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-8 py-4 rounded-xl active:scale-95 transition-all"
        >
          <Zap className="w-5 h-5 text-yellow-400" aria-hidden="true" />
          Start Local Quiz ({localQuestionsCount} questions)
        </button>
        
        <div className="w-full relative flex items-center py-2">
          <div className="flex-grow border-t border-white/10"></div>
          <span className="flex-shrink-0 mx-4 text-gray-500 text-xs font-bold uppercase tracking-widest">or</span>
          <div className="flex-grow border-t border-white/10"></div>
        </div>

        <button
          onClick={handleGenerateAI}
          disabled={quotaExhausted}
          className="w-full flex items-center justify-center gap-2 bg-accent text-[#0a0908] font-bold px-8 py-4 rounded-xl hover:bg-accent/90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          <Sparkles className="w-5 h-5" aria-hidden="true" />
          Generate AI Quiz
        </button>
        <div className="text-xs text-gray-500 mt-1">
          <span className="font-bold text-gray-300">{quota.remaining}/{quota.limit}</span> AI Quizzes available today
        </div>
      </div>
    </div>
  );
}
