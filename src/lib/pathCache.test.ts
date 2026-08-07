import { describe, it, expect } from 'vitest';
import { isPathCacheFresh, PATH_FORMAT_VERSION, pathCacheKey } from './pathCache';

describe('isPathCacheFresh', () => {
  const now = new Date('2026-08-06T00:00:00Z');

  it('is fresh just inside the 30-day window', () => {
    const generatedAt = new Date('2026-07-07T01:00:00Z'); // 29d 23h ago
    expect(isPathCacheFresh(generatedAt, now)).toBe(true);
  });

  it('is stale exactly at 30 days', () => {
    const generatedAt = new Date('2026-07-07T00:00:00Z'); // exactly 30d ago
    expect(isPathCacheFresh(generatedAt, now)).toBe(false);
  });

  it('is stale well past the window', () => {
    const generatedAt = new Date('2026-01-01T00:00:00Z');
    expect(isPathCacheFresh(generatedAt, now)).toBe(false);
  });

  it('is fresh for a row generated moments ago', () => {
    expect(isPathCacheFresh(now, now)).toBe(true);
  });
});

describe('pathCacheKey', () => {
  it('carries the format version, so an old-shape row reads as a miss', () => {
    expect(pathCacheKey('comptia-security')).toBe(`v${PATH_FORMAT_VERSION}:comptia-security`);
    expect(pathCacheKey('spanish')).not.toBe('spanish');
  });
});

describe('isPathCacheFresh for a certification', () => {
  const now = new Date('2026-08-06T00:00:00Z');

  it('keeps a certification path for a week, not a month', () => {
    const tenDaysAgo = new Date('2026-07-27T00:00:00Z');
    expect(isPathCacheFresh(tenDaysAgo, now)).toBe(true);
    expect(isPathCacheFresh(tenDaysAgo, now, true)).toBe(false);
  });

  it('still serves a certification path inside the week', () => {
    expect(isPathCacheFresh(new Date('2026-08-01T00:00:00Z'), now, true)).toBe(true);
  });
});
