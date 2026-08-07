import { describe, expect, it } from 'vitest';
import { getHardcodedCertPath } from './certPaths';
import { detectCertification, enforceCertShape } from './certShape';

describe('getHardcodedCertPath', () => {
  it('matches Security+ regardless of case or spacing', () => {
    expect(getHardcodedCertPath('CompTIA Security+')?.subjectName).toBe('CompTIA Security+');
    expect(getHardcodedCertPath('security +')?.subjectName).toBe('CompTIA Security+');
  });

  it('matches Network+', () => {
    expect(getHardcodedCertPath('CompTIA Network+')?.subjectName).toBe('CompTIA Network+');
  });

  it('matches A+ only alongside "comptia"', () => {
    expect(getHardcodedCertPath('CompTIA A+')?.subjectName).toBe('CompTIA A+');
    expect(getHardcodedCertPath('a+')).toBeNull();
  });

  it('matches the slugified query the home page actually sends', () => {
    // "CompTIA Security+" becomes "comptia-security" in the URL, dropping the
    // "+" the old local regexes matched on.
    expect(getHardcodedCertPath('comptia-security')?.subjectName).toBe('CompTIA Security+');
    expect(getHardcodedCertPath('comptia-network')?.subjectName).toBe('CompTIA Network+');
    expect(getHardcodedCertPath('comptia-a')?.subjectName).toBe('CompTIA A+');
  });

  it('pulls both Messer courses for A+, since it is a two-exam cert', () => {
    const messer = getHardcodedCertPath('comptia a+')!.resources.filter((r) =>
      r.provider.startsWith('Professor Messer'),
    );
    expect(messer.map((r) => r.title)).toEqual([
      expect.stringContaining('220-1201'),
      expect.stringContaining('220-1202'),
    ]);
    // Both exams are required, not alternatives, so each gets its own course
    // step rather than the two sharing one.
    expect(messer.map((r) => r.exam)).toEqual(['Core 1, 220-1201', 'Core 2, 220-1202']);
  });

  it('links Messer to YouTube, since the free course option is YouTube-only', () => {
    for (const key of ['comptia-a', 'comptia-network', 'comptia-security']) {
      const free = getHardcodedCertPath(key)!.resources.filter(
        (r) => r.step === 'course' && r.isFree,
      );
      expect(free.length).toBeGreaterThan(0);
      expect(free.every((r) => r.url.startsWith('https://www.youtube.com/playlist?list='))).toBe(true);
    }
  });

  it('already satisfies the shape enforced on every other certification', () => {
    // If these two ever drift, the hardcoded paths are the ones that look
    // wrong next to a generated one.
    for (const key of ['comptia-a', 'comptia-network', 'comptia-security']) {
      const path = getHardcodedCertPath(key)!;
      const { resources, missing } = enforceCertShape(path.resources, detectCertification(key)!);
      expect(missing).toEqual([]);
      expect(resources).toEqual(path.resources);
    }
  });

  it('returns null for anything else', () => {
    expect(getHardcodedCertPath('AWS Solutions Architect')).toBeNull();
    expect(getHardcodedCertPath('Spanish vocabulary')).toBeNull();
  });

  it('every hardcoded resource has a live-checked https url', () => {
    for (const key of ['comptia-a', 'comptia-network', 'comptia-security']) {
      const path = getHardcodedCertPath(key);
      for (const r of path!.resources) {
        expect(r.url).toMatch(/^https:\/\//);
      }
    }
  });
});
