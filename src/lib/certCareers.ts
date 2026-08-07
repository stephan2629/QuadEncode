import { detectCertification } from '@/lib/certShape';

// What a certification is actually for: the job titles the vendor itself
// names on its career pages, and which exam normally comes after. Written
// from the official pages linked in `source` on each entry (CompTIA's job
// roles and per-exam pages, AWS's certification paths, Microsoft Learn
// credentials, Google Cloud certification, Cisco certifications, PMI, ISC2),
// not from job-board listings or salary sites.
//
// ponytail: a static map, no fetch and no AI call. The path itself already
// costs a Serper + YouTube + Gemini pass and a career roadmap changes maybe
// once a year, so a second live lookup buys nothing. It also means this
// renders for the hardcoded CompTIA paths (src/lib/certPaths.ts), which skip
// the pipeline entirely, and for every cached path with no schema change.
// A certification with no entry here simply shows no career block. Upgrade
// path if these go stale in practice: same fields, read from a table.

export interface CertCareer {
  // Job titles, as the vendor names them.
  roles: string[];
  // What people usually take next. Omitted where the vendor doesn't say.
  next?: string;
  source: { label: string; url: string };
}

const COMPTIA = { label: "CompTIA's career pages", url: 'https://www.comptia.org/en-us/explore-careers/' };

// Keyed by Certification.id from src/lib/certShape.ts.
const TRIFECTA_CAREER: CertCareer = {
  roles: ['Help desk support specialist', 'Network administrator', 'Cyber defense analyst', 'Systems administrator'],
  next: 'The three build on each other: A+ gets you into support, Network+ moves you to network roles, Security+ opens security work and is the baseline on a lot of US government and defense contract postings.',
  source: COMPTIA,
};

const CAREERS: Record<string, CertCareer> = {
  'comptia-trifecta': TRIFECTA_CAREER,
  'comptia-any': TRIFECTA_CAREER,
  'comptia-a': {
    roles: ['Help desk support specialist', 'IT support technician', 'Field service technician', 'Desktop support analyst'],
    next: 'Network+ is the usual next exam, then Security+. Those three together are what most entry-level IT job postings ask for.',
    source: COMPTIA,
  },
  'comptia-network': {
    roles: ['Network support specialist', 'Network administrator', 'Junior network engineer', 'Systems administrator'],
    next: 'Security+ is the usual next exam. From here the other common jump is Cisco CCNA if you want to go deeper on routing and switching.',
    source: COMPTIA,
  },
  'comptia-security': {
    roles: ['Cyber defense analyst', 'Incident responder', 'Vulnerability analyst', 'Systems administrator', 'Security control assessor'],
    next: 'CySA+ for defensive work, PenTest+ for offensive. Security+ is also the baseline requirement on a lot of US government and defense contract roles (DoD 8140).',
    source: COMPTIA,
  },
  'comptia-cysa': {
    roles: ['Security operations center analyst', 'Threat intelligence analyst', 'Incident response analyst', 'Security engineer'],
    next: 'SecurityX (the exam formerly called CASP+) is the advanced step in this track.',
    source: COMPTIA,
  },
  'comptia-pentest': {
    roles: ['Penetration tester', 'Vulnerability analyst', 'Security consultant', 'Application security specialist'],
    next: 'SecurityX (formerly CASP+) or a vendor-neutral offensive certification, depending on whether you want breadth or hands-on depth.',
    source: COMPTIA,
  },
  aws: {
    roles: ['Cloud engineer', 'Solutions architect', 'Cloud support associate', 'DevOps engineer'],
    next: 'Cloud Practitioner if you are new to AWS, then an associate exam (Solutions Architect, Developer, or SysOps), then professional or a specialty.',
    source: { label: "AWS's certification paths", url: 'https://aws.amazon.com/certification/' },
  },
  microsoft: {
    roles: ['Azure administrator', 'Cloud solution architect', 'Security engineer', 'Data engineer'],
    next: 'A fundamentals exam (AZ-900, AI-900, DP-900) proves the basics, then the associate exam for the role you want, then expert.',
    source: { label: 'Microsoft Learn credentials', url: 'https://learn.microsoft.com/en-us/credentials/' },
  },
  'google-cloud': {
    roles: ['Cloud engineer', 'Cloud architect', 'Data engineer', 'DevOps engineer'],
    next: 'Associate Cloud Engineer first, then the professional exam matching the role you are aiming at.',
    source: { label: "Google Cloud's certification page", url: 'https://cloud.google.com/learn/certification' },
  },
  cisco: {
    roles: ['Network engineer', 'Network administrator', 'Network security engineer', 'Network operations technician'],
    next: 'CCNA is the entry point. After that a CCNP track (enterprise, security, or data center) narrows you to one specialty.',
    source: {
      label: "Cisco's certification tracks",
      url: 'https://www.cisco.com/site/us/en/learn/training-certifications/certifications/index.html',
    },
  },
  pmi: {
    roles: ['Project manager', 'Program coordinator', 'Delivery manager', 'PMO analyst'],
    next: 'PMP needs documented project experience hours. CAPM is the version you can take without them.',
    source: { label: "PMI's certification list", url: 'https://www.pmi.org/certifications' },
  },
  isc2: {
    roles: ['Security manager', 'Security architect', 'Security consultant', 'Information security officer'],
    next: 'CISSP needs five years of paid experience in two of its eight domains. SSCP is the entry point if you do not have that yet.',
    source: { label: "ISC2's certifications", url: 'https://www.isc2.org/certifications' },
  },
};

export function getCertCareer(query: string): CertCareer | null {
  const cert = detectCertification(query);
  return cert ? CAREERS[cert.id] ?? null : null;
}
