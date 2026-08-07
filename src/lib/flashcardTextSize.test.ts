import { describe, expect, it } from 'vitest';
import { flashcardTextSizeClass } from './flashcardTextSize';

const SIZES = ['s0', 's1', 's2', 's3', 's4'] as const;

describe('flashcardTextSizeClass', () => {
  const at = (len: number) => flashcardTextSizeClass('x'.repeat(len), SIZES);

  it('keeps a short term at the largest size', () => {
    expect(at(0)).toBe('s0');
    expect(at(55)).toBe('s0');
  });

  it('steps down once past 55 characters', () => {
    expect(at(56)).toBe('s1');
    expect(at(110)).toBe('s1');
  });

  it('steps down again past 110', () => {
    expect(at(111)).toBe('s2');
    expect(at(190)).toBe('s2');
  });

  it('steps down again past 190', () => {
    expect(at(191)).toBe('s3');
    expect(at(320)).toBe('s3');
  });

  it('uses the smallest size for genuinely long text', () => {
    expect(at(321)).toBe('s4');
    expect(at(2000)).toBe('s4');
  });

  it('sizes on the actual text it is given, not a trimmed version', () => {
    // Whitespace still occupies the card, so it counts toward the step.
    expect(flashcardTextSizeClass(' '.repeat(200), SIZES)).toBe('s3');
  });
});
