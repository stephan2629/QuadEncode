import { describe, expect, it } from 'vitest';
import { getQuotaState, QUIZ_DAILY_LIMIT } from './quota';

describe('getQuotaState', () => {
  it('reports remaining quota within the same window', () => {
    const now = new Date('2026-08-03T12:00:00Z');
    const resetAt = new Date('2026-08-03T09:00:00Z');
    const state = getQuotaState({ count: 1, resetAt }, now);
    expect(state.used).toBe(1);
    expect(state.remaining).toBe(QUIZ_DAILY_LIMIT - 1);
    expect(state.exhausted).toBe(false);
    expect(state.resetAt).toEqual(resetAt);
  });

  it('is exhausted once the count reaches the daily limit', () => {
    const now = new Date('2026-08-03T12:00:00Z');
    const resetAt = new Date('2026-08-03T09:00:00Z');
    const state = getQuotaState({ count: QUIZ_DAILY_LIMIT, resetAt }, now);
    expect(state.remaining).toBe(0);
    expect(state.exhausted).toBe(true);
  });

  it('rolls over once 24 hours have passed since the window started', () => {
    const resetAt = new Date('2026-08-01T09:00:00Z');
    const now = new Date('2026-08-03T09:00:01Z');
    const state = getQuotaState({ count: QUIZ_DAILY_LIMIT, resetAt }, now);
    expect(state.used).toBe(0);
    expect(state.remaining).toBe(QUIZ_DAILY_LIMIT);
    expect(state.exhausted).toBe(false);
    expect(state.resetAt).toEqual(now);
  });

  it('does not roll over a moment before the 24-hour mark', () => {
    const resetAt = new Date('2026-08-01T09:00:00Z');
    const now = new Date('2026-08-02T08:59:59Z');
    const state = getQuotaState({ count: QUIZ_DAILY_LIMIT, resetAt }, now);
    expect(state.exhausted).toBe(true);
  });

  it('reports whole hours until reset, floored at 1', () => {
    const resetAt = new Date('2026-08-01T09:00:00Z');
    const now = new Date('2026-08-01T09:00:00Z');
    expect(getQuotaState({ count: 0, resetAt }, now).hoursUntilReset).toBe(24);

    const almostThere = new Date('2026-08-02T08:59:59Z');
    expect(getQuotaState({ count: 0, resetAt }, almostThere).hoursUntilReset).toBe(1);
  });
});
