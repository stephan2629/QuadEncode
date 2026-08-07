import { describe, expect, it } from 'vitest';
import type { PathResource } from '@/app/study/[query]/actions';
import {
  detectCertification,
  enforceCertShape,
  isBlockedSource,
  newestExamVersionFirst,
} from './certShape';

const cert = detectCertification('CompTIA Security+')!;

function res(over: Partial<PathResource> & { url: string }): PathResource {
  return {
    title: 'A resource',
    provider: 'Someone',
    isFree: true,
    cost: 'Free',
    format: 'video',
    description: 'What it covers.',
    ...over,
  };
}

describe('detectCertification', () => {
  it('matches a certification however the query was typed', () => {
    // The home page slugifies "CompTIA Security+" to "comptia-security", so
    // the "+" is gone by the time this runs. All three forms are the same cert.
    expect(detectCertification('CompTIA Security+')?.id).toBe('comptia-security');
    expect(detectCertification('comptia-security')?.id).toBe('comptia-security');
    expect(detectCertification('security plus')?.id).toBe('comptia-security');
  });

  it('picks the specific CompTIA exam, not a broader one that shares a word', () => {
    expect(detectCertification('CompTIA CySA+')?.id).toBe('comptia-cysa');
    expect(detectCertification('comptia-network')?.id).toBe('comptia-network');
    expect(detectCertification('comptia a+')?.id).toBe('comptia-a');
  });

  it('covers the non-CompTIA certifications people search', () => {
    expect(detectCertification('AWS Solutions Architect')?.vendor).toBe('AWS');
    expect(detectCertification('ccna')?.vendor).toBe('Cisco');
    expect(detectCertification('PMP')?.vendor).toBe('PMI');
    expect(detectCertification('az-104')?.vendor).toBe('Microsoft');
    expect(detectCertification('cissp')?.vendor).toBe('ISC2');
  });

  it('treats a vendor named without an exam as a certification search', () => {
    // This is what a bare "CompTIA" search used to do: fall through to a flat
    // AI path with a retry button, which is the opposite of the point.
    expect(detectCertification('comptia')?.id).toBe('comptia-any');
    expect(detectCertification('CompTIA certification')?.id).toBe('comptia-any');
    expect(detectCertification('aws certification')?.vendor).toBe('AWS');
    expect(detectCertification('cisco certification')?.vendor).toBe('Cisco');
    // Still specific when the exam is named.
    expect(detectCertification('comptia security+')?.id).toBe('comptia-security');
  });

  it('leaves skills and subjects alone', () => {
    // These keep the flat AI path, so a false positive here would restructure
    // a path that has no exam to structure it around.
    expect(detectCertification('Spanish vocabulary')).toBeNull();
    expect(detectCertification('music theory')).toBeNull();
    expect(detectCertification('cloud computing')).toBeNull();
    expect(detectCertification('data science')).toBeNull();
    expect(detectCertification('python programming')).toBeNull();
    // A letter grade, not the CompTIA exam.
    expect(detectCertification('a+')).toBeNull();
  });
});

describe('isBlockedSource', () => {
  it('drops user-generated and exam-dump sources', () => {
    expect(isBlockedSource('https://www.reddit.com/r/CompTIA/comments/abc')).toBe(true);
    expect(isBlockedSource('https://www.quora.com/whatever')).toBe(true);
    expect(isBlockedSource('https://www.examtopics.com/exams/comptia/')).toBe(true);
    expect(isBlockedSource('https://braindumps.example.com/sy0-701')).toBe(true);
  });

  it('keeps real sources, and drops anything that is not a URL', () => {
    expect(isBlockedSource('https://www.comptia.org/certifications/security')).toBe(false);
    expect(isBlockedSource('https://www.udemy.com/course/security-plus/')).toBe(false);
    expect(isBlockedSource('not-a-url')).toBe(true);
  });
});

describe('enforceCertShape', () => {
  const overview = res({
    url: 'https://www.comptia.org/certifications/security',
    step: 'overview',
    format: 'text',
  });
  const freeCourse = res({
    url: 'https://www.youtube.com/playlist?list=PLG49S3nxzAnl4QDVqK-hOnoqcSKEIDDuv',
    step: 'course',
    isFree: true,
  });
  const paidCourse = res({
    url: 'https://www.udemy.com/course/comptia-security-plus/',
    step: 'course',
    isFree: false,
    cost: 'Paid',
  });
  const prep = res({
    url: 'https://www.comptia.org/training/certmaster-practice',
    step: 'exam-prep',
    isFree: false,
    cost: 'Paid',
  });

  it('orders a jumbled list into overview, course, exam-prep', () => {
    const { resources, missing } = enforceCertShape([prep, paidCourse, overview, freeCourse], cert);
    expect(resources.map((r) => r.step)).toEqual(['overview', 'course', 'course', 'exam-prep']);
    // Free ahead of paid inside the course step, per CLAUDE.md section 4.
    expect(resources[1].url).toBe(freeCourse.url);
    expect(resources[2].url).toBe(paidCourse.url);
    expect(missing).toEqual([]);
  });

  it('drops an exam-prep resource that is not from the vendor or Udemy', () => {
    const reddit = res({ url: 'https://www.reddit.com/r/CompTIA/', step: 'exam-prep' });
    const blog = res({ url: 'https://someblog.example.com/sy0-701-tips', step: 'exam-prep' });
    const udemyPrep = res({
      url: 'https://www.udemy.com/course/security-practice-exams/',
      step: 'exam-prep',
      isFree: false,
    });

    const { resources } = enforceCertShape(
      [overview, freeCourse, paidCourse, reddit, blog, udemyPrep],
      cert
    );
    const prepUrls = resources.filter((r) => r.step === 'exam-prep').map((r) => r.url);
    expect(prepUrls).toEqual([udemyPrep.url]);
  });

  it('rejects a free course that is not on YouTube rather than substituting one', () => {
    const freeElsewhere = res({ url: 'https://www.professormesser.com/sy0-701/', step: 'course' });
    const { resources, missing } = enforceCertShape([overview, freeElsewhere, prep], cert);
    expect(resources.some((r) => r.step === 'course')).toBe(false);
    expect(missing).toEqual(['course']);
  });

  it('rejects a paid course that is not on Udemy', () => {
    const paidElsewhere = res({
      url: 'https://www.coursera.org/learn/security-plus',
      step: 'course',
      isFree: false,
      cost: 'Paid',
    });
    const { resources } = enforceCertShape([overview, freeCourse, paidElsewhere, prep], cert);
    expect(resources.filter((r) => r.step === 'course').map((r) => r.url)).toEqual([freeCourse.url]);
  });

  it('keeps one course pair per exam for a multi-exam certification', () => {
    const a = detectCertification('comptia a+')!;
    const pair = (exam: string) => [
      res({ url: `https://www.youtube.com/playlist?list=${exam}`, step: 'course', exam }),
      res({
        url: 'https://www.udemy.com/user/jasondion/',
        step: 'course',
        exam,
        isFree: false,
        cost: 'Paid',
      }),
    ];
    const { resources } = enforceCertShape([...pair('Core 1'), ...pair('Core 2')], a);
    expect(resources.map((r) => `${r.exam}:${r.isFree}`)).toEqual([
      'Core 1:true',
      'Core 1:false',
      'Core 2:true',
      'Core 2:false',
    ]);
  });

  it('names every step it could not fill', () => {
    const { resources, missing } = enforceCertShape([freeCourse], cert);
    expect(resources).toHaveLength(1);
    expect(missing).toEqual(['overview', 'exam-prep']);
  });

  it('infers a step when the model left it off', () => {
    const unlabelled = [
      res({ url: 'https://www.comptia.org/certifications/security', format: 'text' }),
      res({ url: 'https://www.youtube.com/playlist?list=abc' }),
      res({
        title: 'SY0-701 practice exams',
        url: 'https://www.udemy.com/course/security-practice-exams/',
        isFree: false,
      }),
    ];
    const { resources, missing } = enforceCertShape(unlabelled, cert);
    expect(resources.map((r) => r.step)).toEqual(['overview', 'course', 'exam-prep']);
    expect(missing).toEqual([]);
  });
});

describe('newestExamVersionFirst', () => {
  const course = (title: string, url: string): PathResource =>
    res({ url, title, step: 'course' });

  it('puts the current exam code ahead of the retired one', () => {
    const old = course('Professor Messer SY0-601 Security+ course', 'https://youtube.com/playlist?list=a');
    const current = course('Professor Messer SY0-701 Security+ course', 'https://youtube.com/playlist?list=b');
    expect(newestExamVersionFirst([old, current]).map((r) => r.title)).toEqual([
      current.title,
      old.title,
    ]);
  });

  it('handles the four-digit CompTIA codes too', () => {
    const a = course('A+ 220-1101 Core 1', 'https://youtube.com/playlist?list=a');
    const b = course('A+ 220-1201 Core 1', 'https://youtube.com/playlist?list=b');
    expect(newestExamVersionFirst([a, b])[0].title).toContain('220-1201');
  });

  it('leaves resources with no comparable code in the order given', () => {
    const a = course('Spanish for beginners', 'https://youtube.com/playlist?list=a');
    const b = course('Spanish, part two', 'https://youtube.com/playlist?list=b');
    expect(newestExamVersionFirst([a, b]).map((r) => r.title)).toEqual([a.title, b.title]);
  });

  it('picks the current course version through enforceCertShape', () => {
    const retired = res({
      url: 'https://www.youtube.com/playlist?list=old',
      title: 'SY0-601 Security+ full course',
      step: 'course',
    });
    const current = res({
      url: 'https://www.youtube.com/playlist?list=new',
      title: 'SY0-701 Security+ full course',
      step: 'course',
    });
    const { resources } = enforceCertShape([retired, current], cert);
    expect(resources.filter((r) => r.step === 'course').map((r) => r.url)).toEqual([current.url]);
  });
});
