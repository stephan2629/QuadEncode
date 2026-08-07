import { describe, expect, it } from 'vitest';
import { getCertCareer } from './certCareers';

describe('getCertCareer', () => {
  it('matches both shapes the query arrives in: URL slug and typed search', () => {
    expect(getCertCareer('comptia-security')?.roles).toContain('Incident responder');
    expect(getCertCareer('CompTIA Security+')?.roles).toContain('Incident responder');
  });

  it('gives each certification its own roles, not the vendor default', () => {
    expect(getCertCareer('comptia-a')?.roles[0]).toBe('Help desk support specialist');
    expect(getCertCareer('AWS Solutions Architect')?.roles).toContain('Solutions architect');
  });

  it('returns null for a subject search, so no career block renders', () => {
    expect(getCertCareer('spanish vocabulary')).toBeNull();
    expect(getCertCareer('music theory')).toBeNull();
  });

  it('points every entry at an official vendor page', () => {
    for (const q of ['comptia-a', 'ccna', 'pmp', 'cissp', 'az-104', 'associate cloud engineer']) {
      const url = getCertCareer(q)?.source.url;
      expect(url, q).toMatch(/^https:\/\/(www\.)?(comptia\.org|cisco\.com|pmi\.org|isc2\.org|aws\.amazon\.com|learn\.microsoft\.com|cloud\.google\.com)\//);
    }
  });
});
