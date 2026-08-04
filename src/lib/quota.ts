// AI quiz generation is capped per CLAUDE.md section 5: 2 generations per
// rolling 24-hour window per user, tracked on profiles.quiz_count_today /
// profiles.last_quiz_reset_at. Pure date math lives here so it's testable
// without a database; the server action just reads/writes the two columns.
export const QUIZ_DAILY_LIMIT = 2;

export interface QuizQuota {
  count: number;
  resetAt: Date;
}

export interface QuotaState {
  used: number;
  remaining: number;
  limit: number;
  resetAt: Date;
  exhausted: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// A window resets once 24 hours have passed since it started, not at a fixed
// wall-clock boundary — simplest rule that matches "2 per 24-hour period."
export function getQuotaState(quota: QuizQuota, now: Date = new Date()): QuotaState {
  const expired = now.getTime() - quota.resetAt.getTime() >= DAY_MS;
  const used = expired ? 0 : quota.count;
  const resetAt = expired ? now : quota.resetAt;

  return {
    used,
    remaining: Math.max(0, QUIZ_DAILY_LIMIT - used),
    limit: QUIZ_DAILY_LIMIT,
    resetAt,
    exhausted: used >= QUIZ_DAILY_LIMIT,
  };
}
