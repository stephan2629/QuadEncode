import { describe, expect, it } from 'vitest';
import { normalizeCertPlus } from './certQuery';

describe('normalizeCertPlus', () => {
  it('turns "Term Plus" into "Term+"', () => {
    expect(normalizeCertPlus('CompTIA Network Plus')).toBe('CompTIA Network+');
  });

  it('is case-insensitive', () => {
    expect(normalizeCertPlus('Security PLUS')).toBe('Security+');
  });

  it('leaves an already-correct "+" query unchanged', () => {
    expect(normalizeCertPlus('CompTIA Network+')).toBe('CompTIA Network+');
  });

  it('leaves queries with no "plus" unchanged', () => {
    expect(normalizeCertPlus('AWS Solutions Architect')).toBe('AWS Solutions Architect');
  });

  it('does not touch "plus" with no preceding space, e.g. a word starting with it', () => {
    expect(normalizeCertPlus('Plus size fashion design')).toBe('Plus size fashion design');
  });
});
