import { describe, expect, it } from 'vitest';
import { isRetired, nextBox, nextDue, RETIRED_BOX } from './scheduler';

describe('nextBox', () => {
  it('moves up one box on correct', () => {
    expect(nextBox(0, true)).toBe(1);
    expect(nextBox(2, true)).toBe(3);
  });

  it('caps at the retired box on correct', () => {
    expect(nextBox(4, true)).toBe(5);
    expect(nextBox(5, true)).toBe(5);
  });

  it('drops to box 1 on wrong, regardless of current box', () => {
    expect(nextBox(0, false)).toBe(1);
    expect(nextBox(3, false)).toBe(1);
    expect(nextBox(5, false)).toBe(1);
  });
});

describe('nextDue', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');

  it('follows the box interval table', () => {
    expect(nextDue(0, now)).toEqual(now);
    expect(nextDue(1, now)).toEqual(new Date('2026-01-02T00:00:00.000Z'));
    expect(nextDue(2, now)).toEqual(new Date('2026-01-04T00:00:00.000Z'));
    expect(nextDue(3, now)).toEqual(new Date('2026-01-08T00:00:00.000Z'));
    expect(nextDue(4, now)).toEqual(new Date('2026-01-22T00:00:00.000Z'));
  });

  it('does not advance a retired card', () => {
    expect(nextDue(5, now)).toEqual(now);
  });
});

describe('isRetired', () => {
  it('is true only at or above the retired box', () => {
    expect(isRetired(4)).toBe(false);
    expect(isRetired(RETIRED_BOX)).toBe(true);
  });
});
