// Multiple-choice practice questions, built from the user's own cards.
// Practice is recognition, not recall, so it lives outside the memory box
// schedule: zero DB reads/writes for reviews rows, zero box changes, zero
// impact on due dates or AI rate limits. Distractors are answers from the 
// user's other cards.

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

// A card authored with the multiple-choice pipe syntax (CLAUDE.md section 9,
// "**A:** Correct | Wrong1 | Wrong2") stores every choice in one answer
// string, first item correct. Splitting it out here matches the convention
// ReviewSession.tsx already uses for the same syntax - without it, the
// whole "Correct | Wrong1 | Wrong2" string would show up as one garbled
// option instead of separate choices.
function correctAnswer(answer: string): string {
  return answer.includes('|') ? answer.split('|')[0].trim() : answer.trim();
}

function ownDistractors(answer: string): string[] {
  if (!answer.includes('|')) return [];
  return answer.split('|').map((s) => s.trim()).filter(Boolean).slice(1);
}

export function buildPracticeQuestions(
  cards: PracticeCard[],
  optionCount = 4,
  rng: () => number = Math.random
): PracticeQuestion[] {
  const usable = cards.filter((c) => c.prompt.trim() !== '' && c.answer.trim() !== '');
  if (usable.length < MIN_PRACTICE_CARDS) return [];

  const shuffled = shuffle(usable, rng);

  return shuffled.map((card) => {
    const correct = correctAnswer(card.answer);
    const authored = ownDistractors(card.answer);

    // A card with its own authored distractors uses those - the actual
    // wrong answers written for this question - rather than random answers
    // borrowed from other cards, which makes for a weaker question.
    const distractorPool = authored.length > 0
      ? shuffle(authored, rng)
      : shuffle(
          Array.from(new Set(
            usable
              .filter((c) => c.id !== card.id)
              .map((c) => correctAnswer(c.answer))
              .filter((a) => a !== correct)
          )),
          rng
        );

    const options = shuffle([correct, ...distractorPool.slice(0, optionCount - 1)], rng);
    return { card: { ...card, answer: correct }, options };
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
