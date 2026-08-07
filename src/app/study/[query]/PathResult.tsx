'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { generatePath, type GeneratedPath } from './actions';
import SavePathButton from './SavePathButton';
import PathTimeline, { buildItems } from '@/components/ui/PathTimeline';
import { detectCertification, STEP_MISSING_COPY } from '@/lib/certShape';
import { getCertCareer } from '@/lib/certCareers';
import { PATH_FORMAT_VERSION } from '@/lib/pathCache';

// useEffect runs after the browser paints, so swapping in a localStorage
// path there shows the SSR/cached path for one frame, then visibly replaces
// it - a content flash. useLayoutEffect runs synchronously before paint, so
// the swap is invisible on first render instead. It warns when it runs
// during server rendering, which Next.js does even for a 'use client'
// component, so fall back to useEffect there; the client always re-runs it
// before paint anyway.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// Skills and subjects only. A certification path is deterministic now
// (src/lib/certShape.ts): there is one correct answer, so a retry can only
// return the same three steps while spending a full Serper + YouTube +
// Gemini pass to do it.
//
// ponytail: cap lives in localStorage only, so clearing storage, an
// incognito window, or a second browser resets it, and each retry still
// costs a full Serper + YouTube + Gemini pass with no server-side quota
// behind it. Matches what was asked (per query per browser, no backend).
// Upgrade path if this gets abused: track tries in a cookie-keyed Postgres
// row like the AI-generation quota in CLAUDE.md section 5.
const MAX_TRIES = 3;

export default function PathResult({ query, initialPath }: { query: string; initialPath: GeneratedPath }) {
  const [pathData, setPathData] = useState(initialPath);
  // Which version of each multi-option step is selected, by item index. Lives
  // here rather than in the card so that saving the path saves what the
  // learner picked: a certification's training course has a free version and
  // a paid one, and only the chosen one goes to the dashboard.
  const [choices, setChoices] = useState<Record<number, number>>({});
  const [tries, setTries] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCertification = !!detectCertification(query);
  // Certifications only, and only the ones with an entry: a subject search
  // has no exam behind it and nothing official to point at.
  const career = getCertCareer(query);
  // Version-stamped for the same reason path_cache is (docs/decisions/0010):
  // a retry stored in this browser overrides whatever the server sends, on
  // every later visit, with no expiry. Without the version an old-format path
  // saved before the certification work keeps being pasted over the new one
  // forever, and only in the browser that stored it, which makes it look like
  // the server never changed.
  const cacheKey = `qe-path-cache:v${PATH_FORMAT_VERSION}:${query}`;
  const triesKey = `qe-path-tries:${query}`;

  // Post-hydration only, so the server-rendered HTML (what crawlers and
  // the first paint see) never mismatches a localStorage override. Runs
  // before paint (see useIsomorphicLayoutEffect above) so a stored retry
  // replaces the SSR path without a visible flash.
  useIsomorphicLayoutEffect(() => {
    // A certification has no retry, so it can have no stored override either.
    // Any entry left from before that rule existed is cleared rather than
    // read, otherwise the one browser that retried keeps showing the old
    // path and nothing on the server can fix it.
    if (isCertification) {
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(`qe-path-cache:${query}`);
      return;
    }

    setTries(Number(localStorage.getItem(triesKey) || 0));
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        setPathData(JSON.parse(cached));
      } catch {
        // malformed cache entry, ignore and keep the SSR default
      }
    }
  }, [query]);

  const handleRetry = async () => {
    if (loading || tries >= MAX_TRIES) return;
    setLoading(true);
    setError(null);

    const result = await generatePath(query, true);
    setLoading(false);

    if ('error' in result) {
      setError(result.error);
      return;
    }

    const nextTries = tries + 1;
    setPathData(result);
    // A new path has new steps, so old selections mean nothing.
    setChoices({});
    setTries(nextTries);
    localStorage.setItem(cacheKey, JSON.stringify(result));
    localStorage.setItem(triesKey, String(nextTries));
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: pathData.subjectName,
    description: pathData.overview,
    provider: {
      '@type': 'Organization',
      name: 'Quad Encode',
      sameAs: 'https://quadencode.com',
    },
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'Online',
    },
  };

  // One resource per step: the chosen version where there is a choice, the
  // only one everywhere else. This is what gets saved, so a learner who picks
  // the paid course does not land on their dashboard with the free one.
  const items = buildItems(pathData.resources);
  const chosenResources = items.map((item, i) => item.options[choices[i] ?? 0] ?? item.options[0]);

  return (
    <div className="fade-in-up">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mb-12 flex flex-col md:flex-row md:items-start justify-between gap-6 text-center md:text-left">
        <div>
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mb-4 tracking-tight">
            {pathData.subjectName}
          </h2>
          <p className="text-gray-400 text-lg md:text-xl font-light max-w-2xl">
            {pathData.overview}
          </p>
        </div>
        <div className="flex-shrink-0 flex flex-col items-center md:items-end gap-2">
          <div className="flex gap-2">
            <SavePathButton pathData={{ ...pathData, resources: chosenResources }} />
            {!isCertification && (
              <button
                onClick={handleRetry}
                disabled={loading || tries >= MAX_TRIES}
                className="text-xs md:text-sm font-semibold text-gray-200 bg-white/10 hover:bg-white/20 px-4 md:px-5 py-2 rounded-full transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Finding another path...' : 'Try a different path'}
              </button>
            )}
          </div>
          {!isCertification && tries >= MAX_TRIES && (
            <p className="text-xs text-gray-500">No more tries for this path</p>
          )}
        </div>
      </div>

      {career && (
        <section className="mb-10 bg-white/[0.03] border border-white/10 rounded-2xl p-5 md:p-6">
          <h3 className="text-xs font-mono uppercase tracking-wider text-accent mb-3">Where this leads</h3>
          <ul className="flex flex-wrap gap-2 mb-4">
            {career.roles.map((role) => (
              <li
                key={role}
                className="text-sm text-gray-200 bg-white/[0.06] border border-white/10 rounded-full px-3 py-1.5"
              >
                {role}
              </li>
            ))}
          </ul>
          {career.next && <p className="text-sm md:text-base text-gray-400 leading-relaxed">{career.next}</p>}
          <a
            href={career.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-4 text-sm text-gray-300 hover:text-accent underline underline-offset-4 decoration-white/20 hover:decoration-accent transition-colors"
          >
            Job roles and progression on {career.source.label}
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </section>
      )}

      {/* Said out loud rather than quietly shipping a two-step certification
          path, so it's clear a step is missing and not just absent. */}
      {pathData.missingSteps?.length ? (
        <div className="mb-6 bg-white/5 border border-white/10 text-gray-300 p-4 rounded-xl text-sm space-y-1">
          {pathData.missingSteps.map((step) => (
            <p key={step}>{STEP_MISSING_COPY[step]}</p>
          ))}
        </div>
      ) : null}

      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      <PathTimeline
        resources={pathData.resources}
        choices={choices}
        onChoose={(item, option) => setChoices((c) => ({ ...c, [item]: option }))}
      />
    </div>
  );
}
