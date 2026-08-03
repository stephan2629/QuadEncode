// Multiple-choice practice questions, built from the user's own cards.
// Practice is recognition, not recall, so it lives outside the Leitner
// schedule entirely (CLAUDE.md section 8: practice modes do not write to
// the schedule). Distractors are answers from the user's other cards.

export interface PracticeCard {
  id: string;
  note_id: string;
  line: number;
  prompt: string;
  answer: string;
}

export interface PracticeQuestion {
  card: PracticeCard;
  options: string[]; // shuffled, includes card.answer
}

export const MIN_PRACTICE_CARDS = 2;

export function buildPracticeQuestions(
  cards: PracticeCard[],
  optionCount = 4,
  rng: () => number = Math.random
): PracticeQuestion[] {
  const usable = cards.filter((c) => c.prompt.trim() !== '' && c.answer.trim() !== '');
  if (usable.length < MIN_PRACTICE_CARDS) return [];

  const shuffled = shuffle(usable, rng);

  return shuffled.map((card) => {
    // Distinct answers from other cards, excluding duplicates of the right one.
    const distractorPool = shuffle(
      Array.from(new Set(usable.filter((c) => c.id !== card.id && c.answer !== card.answer).map((c) => c.answer))),
      rng
    );
    const options = shuffle([card.answer, ...distractorPool.slice(0, optionCount - 1)], rng);
    return { card, options };
  });
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
