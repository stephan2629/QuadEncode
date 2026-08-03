// Leitner boxes, not SM-2. See CLAUDE.md section 8.
export const BOX_INTERVALS_DAYS: Record<number, number> = {
  0: 0,
  1: 1,
  2: 3,
  3: 7,
  4: 21,
};

export const RETIRED_BOX = 5;
export const MAX_BOX = 5;

export function nextBox(box: number, correct: boolean): number {
  if (correct) return Math.min(box + 1, MAX_BOX);
  return 1;
}

export function nextDue(box: number, now: Date = new Date()): Date {
  if (box >= RETIRED_BOX) return now;
  const days = BOX_INTERVALS_DAYS[box] ?? 0;
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

export function isRetired(box: number): boolean {
  return box >= RETIRED_BOX;
}
