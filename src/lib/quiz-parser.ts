import { parseBlanks } from './parseBlanks';

export interface QuizQuestion {
  id: string; // generated ID for tracking
  type: 'quiz' | 'vocab';
  prompt: string;
  correct: string;
  options?: string[]; // undefined for vocab
  explanation?: string;
  originalLine: number; // for back-linking
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function parseLocalQuiz(markdown: string): QuizQuestion[] {
  const blanks = parseBlanks(markdown);
  const questions: QuizQuestion[] = [];

  for (const blank of blanks) {
    if (blank.kind === 'quiz') {
      const parts = blank.answer.split('|').map(s => s.trim()).filter(Boolean);
      if (parts.length === 0) continue;
      
      const correct = parts[0];
      const options = shuffle([...parts]); // already contains distractors
      
      questions.push({
        id: `quiz-${blank.line}`,
        type: 'quiz',
        prompt: blank.prompt,
        correct,
        options,
        explanation: blank.explanation,
        originalLine: blank.line,
      });
    } else if (blank.kind === 'vocab') {
      const correct = blank.answer;
      if (!correct) continue;
      
      questions.push({
        id: `vocab-${blank.line}`,
        type: 'vocab',
        prompt: blank.prompt,
        correct,
        explanation: blank.explanation,
        originalLine: blank.line,
      });
    }
  }
  
  return questions;
}
