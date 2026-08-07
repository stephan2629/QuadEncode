import type { PathResource } from '@/app/study/[query]/actions';

// A certification has one correct answer, so its path is not left to the
// model's judgement: the pipeline is asked for a shape and then the shape is
// enforced here, the same way CLAUDE.md section 4's free-first rule is a sort
// rather than a prompt instruction. A model can ignore an instruction, a
// filter can't. Skills and subjects never come through here - they keep the
// flat, AI-ordered path they have always had.

export type CertStep = 'overview' | 'course' | 'exam-prep';

export const CERT_STEPS: CertStep[] = ['overview', 'course', 'exam-prep'];

export interface Certification {
  // Stable key. src/lib/certPaths.ts pins its hardcoded CompTIA paths to
  // these, so the regexes live in exactly one place.
  id: string;
  vendor: string;
  // Official vendor domains. Doubles as the exam-prep allowlist alongside
  // Udemy, and as the tell for which resource is the official overview.
  domains: string[];
  // Who to prefer for each half of the course step. Hints for the search
  // queries and the prompt only - what actually ships is whatever survives
  // enforceCertShape() below.
  freeCreator?: string;
  paidCreator?: string;
  patterns: RegExp[];
}

const comptia = (id: string, patterns: RegExp[]): Certification => ({
  id: `comptia-${id}`,
  vendor: 'CompTIA',
  domains: ['comptia.org'],
  freeCreator: 'Professor Messer',
  paidCreator: 'Jason Dion',
  patterns,
});

// ponytail: a hand-maintained list, not a registry table. It covers the
// certifications people actually search and nothing else, and every entry
// only supplies domains plus two instructor names - a wrong or missing entry
// degrades to the flat AI path, it doesn't break the search. Upgrade path
// once this outgrows a file (roughly: a second vendor's worth of exams
// arriving per month, or per-exam codes needing maintenance): move it to a
// `certifications` table with the same three fields and read it in
// generatePath().
export const CERTIFICATIONS: Certification[] = [
  // First of the CompTIA entries: "the CompTIA trifecta" names all three of
  // A+, Network+ and Security+ at once, so it must not be caught by any of
  // the single-exam patterns below.
  comptia('trifecta', [/\btrifecta\b/]),
  // CompTIA, most specific first so "CompTIA CySA+" never falls through to
  // the broader Security+ pattern.
  comptia('cysa', [/\bcysa\+?\b/, /\bcomptia\b.*\bcybersecurity analyst\b/]),
  comptia('casp', [/\bcasp\+?\b/, /\bsecurityx\b/]),
  comptia('pentest', [/\bpentest\+?\b/, /\bcomptia\b.*\bpen ?test\b/]),
  comptia('itf', [/\bitf\+?\b/, /\bcomptia\b.*\btech\+?\b/]),
  comptia('linux', [/\blinux\+/, /\bcomptia\b.*\blinux\b/]),
  comptia('cloud', [/\bcloud\+/, /\bcomptia\b.*\bcloud\b/]),
  comptia('server', [/\bserver\+/, /\bcomptia\b.*\bserver\b/]),
  comptia('data', [/\bdata(sys)?\+/, /\bcomptia\b.*\bdata\b/]),
  comptia('project', [/\bproject\+/, /\bcomptia\b.*\bproject\b/]),
  comptia('network', [/\bnetwork\+/, /\bcomptia\b.*\bnetwork\b/]),
  comptia('security', [/\bsecurity\+/, /\bsec\+/, /\bcomptia\b.*\bsecurity\b/]),
  // Bare "a+" is a letter grade without "comptia" next to it.
  comptia('a', [/\bcomptia\b\W+a\+?\b/, /\ba\+ ?(certification|cert|exam)\b/]),
  // Last of the CompTIA entries on purpose: anything naming CompTIA without
  // naming one of its exams gets the trifecta path (src/lib/certPaths.ts),
  // which is the answer to a bare "comptia" search anyway. Every specific
  // exam above is matched first.
  comptia('any', [/\bcomptia\b/]),
  {
    id: 'aws',
    vendor: 'AWS',
    domains: ['aws.amazon.com', 'amazon.com'],
    freeCreator: 'freeCodeCamp',
    paidCreator: 'Stephane Maarek',
    patterns: [
      /\baws\b.*\b(certified|solutions? architect|cloud practitioner|sysops|developer associate|security specialty)\b/,
      /\b(saa|clf|dva|soa|dop|ans)[- ]?c\d\d\b/,
      /\baws\b.*\b(certification|exam)\b/,
    ],
  },
  {
    id: 'microsoft',
    vendor: 'Microsoft',
    domains: ['learn.microsoft.com', 'microsoft.com'],
    freeCreator: 'John Savill',
    paidCreator: 'Scott Duffy',
    patterns: [
      /\b(az|ai|dp|sc|ms|pl|md)[- ]\d{3}\b/,
      /\bazure\b.*\b(certified|fundamentals|administrator|architect|engineer)\b/,
      /\bmicrosoft certified\b/,
      /\bazure\b.*\b(certification|exam)\b/,
    ],
  },
  {
    id: 'google-cloud',
    vendor: 'Google Cloud',
    domains: ['cloud.google.com'],
    freeCreator: 'Google Cloud Tech',
    paidCreator: 'Dan Sullivan',
    patterns: [
      /\bgoogle cloud\b.*\b(certified|associate|professional)\b/,
      /\bassociate cloud engineer\b/,
      /\bprofessional cloud (architect|developer|engineer)\b/,
    ],
  },
  {
    id: 'cisco',
    vendor: 'Cisco',
    domains: ['cisco.com'],
    freeCreator: "Jeremy's IT Lab",
    paidCreator: 'Neil Anderson',
    patterns: [/\bccna\b/, /\bccnp\b/, /\bccie\b/, /\bccst\b/, /\bcisco\b.*\b(certification|certified|exam)\b/],
  },
  {
    id: 'pmi',
    vendor: 'PMI',
    domains: ['pmi.org'],
    freeCreator: 'Mohammed Rahman',
    paidCreator: 'Andrew Ramdayal',
    patterns: [/\bpmp\b/, /\bcapm\b/, /\bproject management professional\b/],
  },
  {
    id: 'isc2',
    vendor: 'ISC2',
    domains: ['isc2.org'],
    freeCreator: 'Inside Cloud and Security',
    paidCreator: 'Thor Pedersen',
    patterns: [/\bcissp\b/, /\bccsp\b/, /\bsscp\b/],
  },
  {
    id: 'itil',
    vendor: 'PeopleCert',
    domains: ['peoplecert.org', 'axelos.com'],
    paidCreator: 'Jason Dion',
    patterns: [/\bitil\b/],
  },
  {
    id: 'ec-council',
    vendor: 'EC-Council',
    domains: ['eccouncil.org'],
    patterns: [/\bceh\b/, /\bcertified ethical hacker\b/],
  },
  {
    id: 'linux-foundation',
    vendor: 'Linux Foundation',
    domains: ['training.linuxfoundation.org', 'cncf.io'],
    freeCreator: 'KodeKloud',
    paidCreator: 'Mumshad Mannambeth',
    patterns: [/\bckad?\b/, /\bcertified kubernetes\b/],
  },
];

// Accepts either shape the query arrives in: the dashed URL slug
// ("comptia-security") or the spaced search string ("CompTIA Security Plus").
// The "+" in an official cert name doesn't survive slugification on the home
// page, so matching has to work without it.
export function detectCertification(query: string): Certification | null {
  const q = query
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+plus\b/g, '+')
    .replace(/\s*\+/g, '+')
    .replace(/\s+/g, ' ')
    .trim();
  return CERTIFICATIONS.find((c) => c.patterns.some((p) => p.test(q))) ?? null;
}

// CLAUDE.md section 20 forbids importing from exam dump sites; a path is not
// allowed to recommend one either. Named rather than left implicit in the
// allowlist so the intent survives the next edit. Matched on hostname, and
// applied to every path, skill or certification.
const NEVER_RECOMMEND = [
  'reddit.com',
  'quora.com',
  'forum',
  'dump', // braindump, examdumps, ...
  'examtopics',
  'examcollection',
  'certkiller',
  'pass4sure',
  'itexams',
  'vceplus',
  'spoto',
];

function host(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function onDomain(url: string, domain: string): boolean {
  const h = host(url);
  return h === domain || h.endsWith(`.${domain}`);
}

export function isBlockedSource(url: string): boolean {
  const h = host(url);
  if (!h) return true;
  return NEVER_RECOMMEND.some((bad) => h.includes(bad));
}

const isYouTube = (url: string) => onDomain(url, 'youtube.com') || onDomain(url, 'youtu.be');
const isUdemy = (url: string) => onDomain(url, 'udemy.com');
const isVendor = (url: string, cert: Certification) => cert.domains.some((d) => onDomain(url, d));

// Only used when the model omitted "step" entirely. Cheap insurance: without
// it an unlabelled resource is dropped, which turns one sloppy response into
// a path that reports a missing step.
function inferStep(r: PathResource, cert: Certification): CertStep {
  const looksLikePractice = /practice|mock exam|question bank|study guide|quiz/i.test(
    `${r.title} ${r.url}`
  );
  if (isVendor(r.url, cert)) return looksLikePractice ? 'exam-prep' : 'overview';
  if (looksLikePractice) return 'exam-prep';
  if (isYouTube(r.url) || isUdemy(r.url)) return 'course';
  // Anything else can only be exam-prep, where the allowlist below drops it.
  return 'exam-prep';
}

// Exam codes carry a version: SY0-601 was replaced by SY0-701, 220-1101 by
// 220-1201, CS0-002 by CS0-003. Search engines still rank the retired course
// highly for years, so relevance order alone will happily hand back a course
// for an exam nobody can sit any more.
//
// No table of current codes is kept here on purpose: it would need editing
// every time a vendor refreshes an exam, which is exactly the maintenance
// this avoids. Instead, two candidates that name the same code prefix are
// compared by number and the higher one wins. Candidates that share no
// prefix are left in the order they arrived, so this only ever fires when it
// is genuinely looking at two versions of one exam.
const EXAM_CODE = /\b([a-z]{1,4}\d?|\d{3})-(?:c)?(\d{2,4})\b/gi;

function examVersions(r: PathResource): Map<string, number> {
  const found = new Map<string, number>();
  for (const [, prefix, num] of `${r.title} ${r.url}`.matchAll(EXAM_CODE)) {
    const key = prefix.toLowerCase();
    found.set(key, Math.max(found.get(key) ?? 0, Number(num)));
  }
  return found;
}

export function newestExamVersionFirst<T extends PathResource>(resources: T[]): T[] {
  const versions = resources.map(examVersions);
  return resources
    .map((r, i) => ({ r, i }))
    .sort((a, b) => {
      for (const [prefix, aNum] of versions[a.i]) {
        const bNum = versions[b.i].get(prefix);
        if (bNum !== undefined && bNum !== aNum) return bNum - aNum;
      }
      return a.i - b.i; // stable: nothing comparable, keep the given order
    })
    .map(({ r }) => r);
}

export interface CertShapeResult {
  resources: PathResource[];
  missing: CertStep[];
}

// Buckets a generated path into overview -> course -> exam-prep and drops
// everything that doesn't fit, rather than reordering it. Rules, in order:
//   overview   the vendor's own exam page, one of them
//   course     one free (YouTube only) and one paid (Udemy only), free first,
//              repeated per exam for a multi-exam certification like A+
//   exam-prep  vendor or Udemy only, at most two
export function enforceCertShape(resources: PathResource[], cert: Certification): CertShapeResult {
  // Every resource carries a step from here down, inferred if the model
  // left it off, so the buckets below never have to handle undefined.
  type Stepped = PathResource & { step: CertStep };
  const stepped: Stepped[] = resources
    .filter((r) => !isBlockedSource(r.url))
    .map((r) => ({ ...r, step: r.step ?? inferStep(r, cert) }));

  const overview = stepped.filter((r) => r.step === 'overview');
  const best = overview.find((r) => isVendor(r.url, cert)) ?? overview[0];

  // Grouped by exam so a two-exam certification keeps a course step per exam
  // (A+ Core 1 and Core 2 are both required, not alternatives) while a
  // single-exam cert still gets exactly one.
  const courses = stepped.filter((r) => r.step === 'course');
  const exams = [...new Set(courses.map((r) => r.exam ?? ''))];
  const courseOut = exams.flatMap((exam) => {
    // Newest exam version first, so a course for a retired exam code never
    // takes the slot from the current one.
    const group = newestExamVersionFirst(courses.filter((r) => (r.exam ?? '') === exam));
    const free = group.find((r) => r.isFree && isYouTube(r.url));
    const paid = group.find((r) => !r.isFree && isUdemy(r.url));
    return [free, paid].filter((r): r is Stepped => !!r);
  });

  // Free first here too, so a free practice quiz on the vendor's own site
  // beats a paid practice exam to the first slot and both show when both
  // exist. Unlike the course step these stay two cards: a free question bank
  // and a paid practice exam are not two versions of one thing, and working
  // through both is normal.
  // Newest version first, then free first. Both sorts are stable, so the
  // second keeps the version order inside each of the free and paid groups.
  const prep = newestExamVersionFirst(
    stepped.filter((r) => r.step === 'exam-prep' && (isVendor(r.url, cert) || isUdemy(r.url)))
  )
    .sort((a, b) => Number(b.isFree) - Number(a.isFree))
    .slice(0, 2);

  const out = [...(best ? [best] : []), ...courseOut, ...prep];
  return { resources: out, missing: CERT_STEPS.filter((s) => !out.some((r) => r.step === s)) };
}

const STEP_HEADING: Record<CertStep, string> = {
  overview: 'Overview of the exam, official site',
  course: 'Training course',
  'exam-prep': 'Exam prep material',
};

export function stepHeading(step: CertStep, exam?: string): string {
  return exam ? `${STEP_HEADING[step]} (${exam})` : STEP_HEADING[step];
}

export const STEP_MISSING_COPY: Record<CertStep, string> = {
  overview: 'No official exam page came back for this certification.',
  course: 'No training course passed the checks for this certification (the free version has to be on YouTube, the paid one on Udemy).',
  'exam-prep': 'No exam prep material came back from a trusted source, so this path stops at the training course.',
};
