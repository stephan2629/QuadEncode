import Link from 'next/link';
import Image from 'next/image';

// The landing page, /study/[query], and the dashboard. Not the note editor and
// not the review screen: CLAUDE.md section 15 wants one screen doing one job,
// and anything visible during recall that isn't the prompt is an escape hatch
// from the hard part. The dashboard is a hub rather than a working screen, so
// a footer there costs nothing.
//
// Every link here points at a route that exists. "Sign in" stays listed even
// on the signed-in dashboard: middleware bounces an authenticated visitor from
// /login straight back to /dashboard (src/utils/supabase/middleware.ts), so it
// costs a redirect rather than a dead end, and the footer needs no auth state
// of its own. No privacy or terms page has
// been written yet, so neither is listed rather than shipping a dead link, and
// there are no social accounts to link to.
//
// The three subject links are real paths that are already generated and
// cached, so they load immediately and give crawlers a way into the /study
// pages that section 16 exists to make indexable. Swap them for whatever is
// worth surfacing; each is just a slug.
const SUBJECTS = [
  { slug: 'comptia-security', label: 'CompTIA Security+' },
  { slug: 'spanish', label: 'Spanish' },
  { slug: 'python-programming', label: 'Python programming' },
];

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-[#0a0908] px-4 md:px-8 pt-14 pb-10">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr] gap-10 md:gap-8 text-left">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Image src="/logo.png" alt="" width={24} height={24} className="w-6 h-6" aria-hidden="true" />
              <span className="font-serif font-bold text-lg tracking-tight text-white">Quad Encode</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed max-w-sm">
              Search a subject to get a path of resources, or write your own notes and turn them into
              prompts that ask you the question before they show you the answer.
            </p>
          </div>

          <nav aria-labelledby="footer-start">
            <h2
              id="footer-start"
              className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-4"
            >
              Start
            </h2>
            <ul className="space-y-1">
              <li>
                <Link href="/" className="inline-flex items-center min-h-[44px] text-sm text-gray-300 hover:text-accent transition-colors">
                  Find a path
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="inline-flex items-center min-h-[44px] text-sm text-gray-300 hover:text-accent transition-colors">
                  Open a note
                </Link>
              </li>
              <li>
                <Link href="/login" className="inline-flex items-center min-h-[44px] text-sm text-gray-300 hover:text-accent transition-colors">
                  Sign in
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-labelledby="footer-subjects">
            <h2
              id="footer-subjects"
              className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-4"
            >
              Paths
            </h2>
            <ul className="space-y-1">
              {SUBJECTS.map((subject) => (
                <li key={subject.slug}>
                  <Link
                    href={`/study/${subject.slug}`}
                    className="inline-flex items-center min-h-[44px] text-sm text-gray-300 hover:text-accent transition-colors"
                  >
                    {subject.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-gray-500 font-mono">
            © {new Date().getFullYear()} Quad Encode
          </p>
          <p className="text-xs text-gray-500">Free to use. Nothing here asks for a card.</p>
        </div>
      </div>
    </footer>
  );
}
