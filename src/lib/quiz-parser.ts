import { parseBlanks } from './parseBlanks';

export interface QuizQuestion {
  id: string; // generated ID for tracking
  prompt: string;
  correct: string;
  options: string[];
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

const FALLBACK_DISTRACTORS = [
  "Not enough context provided.",
  "None of the above.",
  "All of the above.",
  "A concept related to the current topic."
];

export function parseLocalQuiz(markdown: string): QuizQuestion[] {
  const blanks = parseBlanks(markdown);
  const questions: QuizQuestion[] = [];
  
  const vocabBlanks = blanks.filter(b => b.kind === 'vocab' && b.answer);
  const vocabDefs = vocabBlanks.map(b => b.answer);
  
  for (const blank of blanks) {
    if (blank.kind === 'quiz') {
      const parts = blank.answer.split('|').map(s => s.trim()).filter(Boolean);
      if (parts.length === 0) continue;
      
      const correct = parts[0];
      const options = shuffle([...parts]); // already contains distractors
      
      questions.push({
        id: `quiz-${blank.line}`,
        prompt: blank.prompt,
        correct,
        options,
        explanation: blank.explanation,
        originalLine: blank.line,
      });
    } else if (blank.kind === 'vocab') {
      const correct = blank.answer;
      if (!correct) continue;
      
      // Get 3 other random definitions from this note
      const otherDefs = vocabDefs.filter(def => def !== correct);
      const distractors = shuffle(otherDefs).slice(0, 3);
      
      // Pad with fallbacks if there aren't enough vocab words in the note
      let i = 0;
      while (distractors.length < 3) {
        distractors.push(FALLBACK_DISTRACTORS[i % FALLBACK_DISTRACTORS.length]);
        i++;
      }
      
      const options = shuffle([correct, ...distractors]);
      
      questions.push({
        id: `vocab-${blank.line}`,
        prompt: `What is the definition of "${blank.prompt}"?`,
        correct,
        options,
        explanation: blank.explanation,
        originalLine: blank.line,
      });
    }
  }
  
  return questions;
}
