// Shared path_cache freshness check, isolated from the database per
// docs/decisions/0006 so it's testable without one (mirrors src/lib/quota.ts).
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// A certification path goes stale faster than a subject path. Vendors retire
// exam codes on their own schedule (SY0-601 to SY0-701 and so on), and a
// cached path pointing at a course for an exam nobody can sit is worse than
// spending the pipeline cost again. A subject like "music theory" has no such
// clock, so it keeps the longer window.
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function isPathCacheFresh(
  generatedAt: Date,
  now: Date = new Date(),
  isCertification = false
): boolean {
  const window = isCertification ? SEVEN_DAYS_MS : THIRTY_DAYS_MS;
  return now.getTime() - generatedAt.getTime() < window;
}

// Bumped whenever the stored path shape changes. v2 is the certification
// overview -> course -> exam-prep shape (docs/decisions/0010); v1 rows hold
// the old free-text `stage` field and would otherwise keep being served for
// their full 30 days to anyone who had already searched that subject.
export const PATH_FORMAT_VERSION = 2;

// The version rides in the row key rather than a column, so a mismatch is
// just a cache miss with no migration to run.
// ponytail: v1 rows are stranded, not deleted - they take space until someone
// runs `delete from path_cache where slug not like 'v2:%'`. Fine at one row
// per searched subject; worth automating only if a format bump becomes
// routine.
export function pathCacheKey(slug: string): string {
  return `v${PATH_FORMAT_VERSION}:${slug}`;
}
