'use client';

import { useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { type GeneratedPath } from './actions';
import SavePathButton from './SavePathButton';
import PathTimeline, { buildItems } from '@/components/ui/PathTimeline';
import { STEP_MISSING_COPY } from '@/lib/certShape';
import { getCertCareer } from '@/lib/certCareers';

export default function PathResult({ query, initialPath }: { query: string; initialPath: GeneratedPath }) {
  const pathData = initialPath;
  // Which version of each multi-option step is selected, by item index. Lives
  // here rather than in the card so that saving the path saves what the
  // learner picked: a certification's training course has a free version and
  // a paid one, and only the chosen one goes to the dashboard.
  const [choices, setChoices] = useState<Record<number, number>>({});
  const searchParams = useSearchParams();
  const urlChoices = useMemo(() => {
    const raw = searchParams.get('choices');
    if (!raw) return {};
    return raw.split(',').reduce<Record<number, number>>((result, pair) => {
      const [item, option] = pair.split(':').map(Number);
      if (Number.isInteger(item) && item >= 0 && Number.isInteger(option) && option >= 0) result[item] = option;
      return result;
    }, {});
  }, [searchParams]);

  // Certifications only, and only the ones with an entry: a subject search
  // has no exam behind it and nothing official to point at.
  const career = getCertCareer(query);
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
  const resolvedChoices = Object.keys(choices).length ? choices : urlChoices;
  const chosenResources = items.map((item, i) => item.options[resolvedChoices[i] ?? 0] ?? item.options[0]);
  const safeJsonLd = JSON.stringify(jsonLd).replace(/</g, '\\u003c');

  return (
    <div className="fade-in-up">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd }}
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
        <div className="flex-shrink-0">
          <SavePathButton pathData={{ ...pathData, resources: chosenResources }} />
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
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
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

      <PathTimeline
        resources={pathData.resources}
        choices={resolvedChoices}
        onChoose={(item, option) => {
          const nextChoices = { ...resolvedChoices, [item]: option };
          setChoices(nextChoices);
          const params = new URLSearchParams(searchParams);
          params.set('choices', Object.entries(nextChoices).map(([step, selected]) => `${step}:${selected}`).join(','));
          window.history.replaceState(null, '', `?${params.toString()}`);
        }}
      />
    </div>
  );
}
