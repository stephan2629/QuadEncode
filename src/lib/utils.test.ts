import { describe, expect, it } from 'vitest';
import { cn, seededShuffle } from './utils';

describe('cn', () => {
  it('merges class names and resolves Tailwind conflicts', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-white', false && 'hidden', 'font-bold')).toBe('text-white font-bold');
  });
});

describe('seededShuffle', () => {
  it('returns the same order every time for the same seed', () => {
    const items = ['a', 'b', 'c', 'd'];
    expect(seededShuffle(items, 'card-1')).toEqual(seededShuffle(items, 'card-1'));
  });

  it('does not mutate the input array', () => {
    const items = ['a', 'b', 'c'];
    seededShuffle(items, 'seed');
    expect(items).toEqual(['a', 'b', 'c']);
  });

  it('contains exactly the same elements as the input', () => {
    const items = ['a', 'b', 'c', 'd'];
    expect(seededShuffle(items, 'seed').sort()).toEqual([...items].sort());
  });
});
