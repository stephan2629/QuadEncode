import type { PathResource } from '@/app/study/[query]/actions';
import { detectCertification } from '@/lib/certShape';

// Hardcoded CompTIA A+/Network+/Security+ roadmaps, per explicit user
// decision (see chat): these three skip the live Serper/YouTube/Gemini
// pipeline entirely and return a fixed overview -> course -> exam-prep path
// (src/lib/certShape.ts defines that shape and enforces it on every other
// certification), using exactly Professor Messer (free, on YouTube) and
// Jason Dion (paid, on Udemy) - no other instructor is ever substituted in
// for these three exams. Every URL below was checked live (curl, 200) before
// being hardcoded here. None of it runs through checkLinkStatus the way the
// generated pipeline does, so a link that goes stale later stays broken
// until someone edits this file by hand.
//
// Messer's courses link to his YouTube playlists, not professormesser.com:
// the free half of a course step is YouTube-only (certShape.ts), and the
// playlist is what the rest of the app can actually embed and take notes
// against. Playlists are pinned by current exam code (220-1201/1202,
// N10-009, SY0-701), not by newest upload, so a study-group livestream or a
// short clip can't take the course slot.
//
// ponytail: three exams, not a general certification database. Every other
// certification (AWS, CCNA, Azure, PMP...) goes through the live pipeline in
// study/[query]/actions.ts, which now returns the same three-step shape from
// real, link-checked results. Add another entry here only if a specific cert
// needs this same hard pin (a wrong instructor, a wrong playlist).

export interface HardcodedCertPath {
  subjectName: string;
  overview: string;
  resources: PathResource[];
}

const CERTMASTER_PRACTICE = {
  title: 'CompTIA CertMaster Practice',
  url: 'https://www.comptia.org/training/certmaster-practice',
  provider: 'CompTIA',
  isFree: false,
  cost: 'Free preview, paid for full access',
  format: 'text' as const,
  description:
    'Official adaptive practice questions mapped to the current exam objectives, with a free preview before you buy. Jason Dion also sells standalone practice exams on Udemy as a paid alternative.',
  step: 'exam-prep' as const,
};

// Keyed by Certification.id from src/lib/certShape.ts.
const SINGLE_CERTS: Record<string, HardcodedCertPath> = {
  'comptia-a': {
    subjectName: 'CompTIA A+',
    overview:
      'A two-exam certification covering PC hardware, mobile devices, networking basics, operating systems, and troubleshooting for entry-level IT support roles.',
    resources: [
      {
        title: 'CompTIA A+ official certification page',
        url: 'https://www.comptia.org/certifications/a',
        provider: 'CompTIA',
        isFree: true,
        cost: 'Free',
        format: 'text',
        description:
          'Official exam objectives, domain weighting, and pricing for both A+ exams (220-1201 Core 1, 220-1202 Core 2). Download the objectives PDF here before you start studying.',
        step: 'overview',
      },
      {
        title: 'Professor Messer 220-1201 (Core 1) training course',
        url: 'https://www.youtube.com/playlist?list=PLG49S3nxzAnnes8ZGI-OBlKEukHCX46N8',
        provider: 'Professor Messer (YouTube)',
        isFree: true,
        cost: 'Free',
        format: 'video',
        description:
          'Full free video training for the Core 1 exam: hardware, networking, mobile devices, and cloud and virtualization basics. A+ takes both exams, so this course is half the material.',
        step: 'course',
        exam: 'Core 1, 220-1201',
      },
      {
        title: "Jason Dion's CompTIA A+ Core 1 course",
        url: 'https://www.udemy.com/user/jasondion/',
        provider: 'Jason Dion (Udemy)',
        isFree: false,
        cost: 'Paid',
        format: 'video',
        description:
          'Paid alternative to the Messer course, with graded quizzes built in. His instructor page lists the current Core 1 course; the exam code in the title is the one to match.',
        step: 'course',
        exam: 'Core 1, 220-1201',
      },
      {
        title: 'Professor Messer 220-1202 (Core 2) training course',
        url: 'https://www.youtube.com/playlist?list=PLG49S3nxzAnn7PDGQ17m5AYbDRhnW7vOb',
        provider: 'Professor Messer (YouTube)',
        isFree: true,
        cost: 'Free',
        format: 'video',
        description:
          'Full free video training for the Core 2 exam: operating systems, security, software troubleshooting, and operational procedures. Take this after Core 1; you need both to certify.',
        step: 'course',
        exam: 'Core 2, 220-1202',
      },
      {
        title: "Jason Dion's CompTIA A+ Core 2 course",
        url: 'https://www.udemy.com/user/jasondion/',
        provider: 'Jason Dion (Udemy)',
        isFree: false,
        cost: 'Paid',
        format: 'video',
        description:
          'Paid alternative for the second exam, same format as his Core 1 course. Check the exam code in the title before buying, since Core 1 and Core 2 are sold separately.',
        step: 'course',
        exam: 'Core 2, 220-1202',
      },
      { ...CERTMASTER_PRACTICE },
    ],
  },
  'comptia-network': {
    subjectName: 'CompTIA Network+',
    overview:
      'A single-exam certification (N10-009) covering networking concepts, infrastructure, operations, security, and troubleshooting.',
    resources: [
      {
        title: 'CompTIA Network+ official certification page',
        url: 'https://www.comptia.org/certifications/network',
        provider: 'CompTIA',
        isFree: true,
        cost: 'Free',
        format: 'text',
        description:
          'Official exam objectives, domain weighting, exam code (N10-009), and pricing. Download the objectives PDF here before you start studying.',
        step: 'overview',
      },
      {
        title: 'Professor Messer N10-009 training course',
        url: 'https://www.youtube.com/playlist?list=PLG49S3nxzAnl_tQe3kvnmeMid0mjF8Le8',
        provider: 'Professor Messer (YouTube)',
        isFree: true,
        cost: 'Free',
        format: 'video',
        description:
          'Full free video training covering every N10-009 objective: network fundamentals, infrastructure, operations, security, and troubleshooting.',
        step: 'course',
      },
      {
        title: "Jason Dion's CompTIA Network+ course",
        url: 'https://www.udemy.com/user/jasondion/',
        provider: 'Jason Dion (Udemy)',
        isFree: false,
        cost: 'Paid',
        format: 'video',
        description:
          'Paid alternative to the Messer course, with graded quizzes and section reviews built in. Search his instructor page for the current N10-009 listing.',
        step: 'course',
      },
      {
        title: 'CompTIA Network+ free practice questions',
        url: 'https://www.comptia.org/en-us/certifications/network/practice-questions/',
        provider: 'CompTIA',
        isFree: true,
        cost: 'Free',
        format: 'text',
        description:
          'Official free practice questions for the current N10-009 exam, straight from CompTIA. Worth working through before paying for anything, and it shows you the question style the real exam uses.',
        step: 'exam-prep',
      },
      { ...CERTMASTER_PRACTICE },
    ],
  },
  'comptia-security': {
    subjectName: 'CompTIA Security+',
    overview:
      'A single-exam certification (SY0-701) covering security fundamentals, threats, architecture, operations, and program management.',
    resources: [
      {
        title: 'CompTIA Security+ official certification page',
        url: 'https://www.comptia.org/certifications/security',
        provider: 'CompTIA',
        isFree: true,
        cost: 'Free',
        format: 'text',
        description:
          'Official exam objectives, domain weighting, exam code (SY0-701), and pricing. Download the objectives PDF here before you start studying.',
        step: 'overview',
      },
      {
        title: 'Professor Messer SY0-701 training course',
        url: 'https://www.youtube.com/playlist?list=PLG49S3nxzAnl4QDVqK-hOnoqcSKEIDDuv',
        provider: 'Professor Messer (YouTube)',
        isFree: true,
        cost: 'Free',
        format: 'video',
        description:
          'Full free video training covering every SY0-701 objective: general security concepts, threats, architecture, operations, and program management.',
        step: 'course',
      },
      {
        title: "Jason Dion's CompTIA Security+ course",
        url: 'https://www.udemy.com/user/jasondion/',
        provider: 'Jason Dion (Udemy)',
        isFree: false,
        cost: 'Paid',
        format: 'video',
        description:
          'Paid alternative to the Messer course, with graded quizzes and section reviews built in. Search his instructor page for the current SY0-701 listing.',
        step: 'course',
      },
      {
        title: 'CompTIA Security+ free practice questions',
        url: 'https://www.comptia.org/en-us/certifications/security/practice-questions/',
        provider: 'CompTIA',
        isFree: true,
        cost: 'Free',
        format: 'text',
        description:
          'Official free practice questions for the current SY0-701 exam, straight from CompTIA. Worth working through before paying for anything, and it shows you the question style the real exam uses.',
        step: 'exam-prep',
      },
      { ...CERTMASTER_PRACTICE },
    ],
  },
};

// A+ -> Network+ -> Security+ in that order, which is the progression most
// entry-level IT job postings ask for and what people mean by "the CompTIA
// trifecta". Composed from the three entries above rather than written out a
// fourth time: a Messer playlist that moves, or an exam code that turns over,
// stays one edit instead of two that drift apart.
//
// Each resource's exam label is prefixed with the certification it belongs
// to, since that label is what PathTimeline puts in the step headings - three
// unlabelled runs of "Training course" would give no clue which exam you are
// looking at. CompTIA's CertMaster page repeats once per certification on
// purpose: it is sold per exam, and it sits in that exam's prep step.
const TRIFECTA_ORDER = ['comptia-a', 'comptia-network', 'comptia-security'];

const TRIFECTA: HardcodedCertPath = {
  subjectName: 'CompTIA Trifecta',
  overview:
    'The three CompTIA exams people usually take together, in order: A+ (two exams) for IT support fundamentals, then Network+ for networking, then Security+ for security. Each one below starts with the official exam page, then a training course (free or paid), then practice material.',
  resources: TRIFECTA_ORDER.flatMap((id) => {
    const cert = SINGLE_CERTS[id];
    return cert.resources.map((r) => ({
      ...r,
      exam: r.exam ? `${cert.subjectName} ${r.exam}` : cert.subjectName,
    }));
  }),
};

const CERTS: Record<string, HardcodedCertPath> = {
  ...SINGLE_CERTS,
  'comptia-trifecta': TRIFECTA,
  // A bare "CompTIA" search names no single exam, so the trifecta is the
  // honest answer to it rather than an AI-picked guess at which exam was meant.
  'comptia-any': TRIFECTA,
};

// Matching is detectCertification's job, not a second set of regexes here.
// The old local ones missed the case that actually reaches this function: the
// home page slugifies "CompTIA Security+" to "comptia-security", dropping the
// "+" that /security\s*\+/ was looking for, so the pinned path never fired
// for the query it was written for.
export function getHardcodedCertPath(query: string): HardcodedCertPath | null {
  const cert = detectCertification(query);
  return cert ? CERTS[cert.id] ?? null : null;
}
