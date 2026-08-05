import { describe, expect, it } from 'vitest';
import { buildPracticeQuestions, type PracticeCard } from './practice';

function card(id: string, answer: string, prompt = `Prompt ${id}`): PracticeCard {
  return { id, note_id: 'n1', line: 0, prompt, answer };
}

// Deterministic rng for stable tests.
const fixedRng = () => 0.5;

describe('buildPracticeQuestions', () => {
  it('returns nothing with fewer than two usable cards', () => {
    expect(buildPracticeQuestions([card('a', 'One')], 4, fixedRng)).toEqual([]);
    expect(buildPracticeQuestions([], 4, fixedRng)).toEqual([]);
  });

  it('skips cards with empty prompts or answers', () => {
    const cards = [card('a', 'One'), card('b', ''), card('c', 'Three', '')];
    expect(buildPracticeQuestions(cards, 4, fixedRng)).toEqual([]);
  });

  it('always includes the correct answer among the options', () => {
    const cards = [card('a', 'One'), card('b', 'Two'), card('c', 'Three'), card('d', 'Four'), card('e', 'Five')];
    const questions = buildPracticeQuestions(cards, 4, fixedRng);
    expect(questions).toHaveLength(5);
    for (const q of questions) {
      expect(q.options).toContain(q.card.answer);
      expect(q.options.length).toBeLessThanOrEqual(4);
      expect(new Set(q.options).size).toBe(q.options.length);
    }
  });

  it('caps options at optionCount even with many cards', () => {
    const cards = Array.from({ length: 10 }, (_, i) => card(String(i), `Answer ${i}`));
    const questions = buildPracticeQuestions(cards, 4, fixedRng);
    for (const q of questions) {
      expect(q.options).toHaveLength(4);
    }
  });

  it('degrades gracefully with only two cards', () => {
    const questions = buildPracticeQuestions([card('a', 'One'), card('b', 'Two')], 4, fixedRng);
    expect(questions).toHaveLength(2);
    for (const q of questions) {
      expect(q.options).toHaveLength(2);
    }
  });

  it('never uses a duplicate of the correct answer as a distractor', () => {
    const cards = [card('a', 'Same'), card('b', 'Same'), card('c', 'Other')];
    const questions = buildPracticeQuestions(cards, 4, fixedRng);
    for (const q of questions) {
      const matching = q.options.filter((o) => o === q.card.answer);
      expect(matching).toHaveLength(1);
    }
  });

  it('splits a pipe-syntax multiple-choice answer into separate options instead of one garbled string', () => {
    const cards = [
      card('a', 'Perro | Gato | Pájaro | Pez', 'What is "dog"?'),
      card('b', 'To learn.'),
      card('c', 'To develop.'),
    ];
    const questions = buildPracticeQuestions(cards, 4, fixedRng);
    const dogQuestion = questions.find((q) => q.card.id === 'a')!;

    expect(dogQuestion.card.answer).toBe('Perro');
    expect(dogQuestion.options).toContain('Perro');
    expect(dogQuestion.options).toContain('Gato');
    expect(dogQuestion.options).toContain('Pájaro');
    expect(dogQuestion.options).toContain('Pez');
    for (const option of dogQuestion.options) {
      expect(option).not.toContain('|');
    }
  });

  it("uses a pipe-syntax card's own distractors rather than borrowing another card's raw pipe string", () => {
    const cards = [
      card('a', 'Perro | Gato | Pájaro | Pez', 'What is "dog"?'),
      card('b', 'To learn.'),
      card('c', 'To develop.'),
    ];
    const questions = buildPracticeQuestions(cards, 4, fixedRng);
    const plainQuestion = questions.find((q) => q.card.id === 'b')!;
    for (const option of plainQuestion.options) {
      expect(option).not.toContain('|');
    }
  });
});
