import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { generatePath } from './actions';
import SavePathButton from './SavePathButton';
import PathTimeline from '@/components/ui/PathTimeline';
import WordCycleLoader from '@/components/ui/WordCycleLoader';
import SquareLoader from '@/components/ui/SquareLoader';

// ISR per CLAUDE.md section 16 ("generated at build time or with ISR,
// never client side"). The Serper + YouTube + Gemini + link-check pipeline
// in generatePath() measured at 21.5s in production - without this, every
// single visitor (including Google's crawler) paid that cost on every
// request, because calling a 'use server' action directly from this page
// for data made the whole route fully dynamic. A week matches how often a
// curated resource list actually goes stale; the first visitor after that
// window pays the 21s once, everyone else gets the cached page instantly.
export const revalidate = 604800;

export async function generateMetadata({ params }: { params: Promise<{ query: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const decodedQuery = decodeURIComponent(resolvedParams.query).replace(/-/g, ' ');
  const titleName = decodedQuery.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const title = `Study ${titleName} - Quad Encode Learning Path`;
  const description = `Get a free, AI-curated learning path to study ${titleName}. Ranked resources, video courses, and more.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `/study/${resolvedParams.query}`,
    },
  };
}

export default async function StudyPage({ params }: { params: Promise<{ query: string }> }) {
  const { query } = await params;
  
  return (
    <div className="min-h-screen bg-[#0a0908] text-white">
      <header className="sticky top-0 z-50 bg-[#0a0908]/80 backdrop-blur-xl border-b border-white/10 px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="hidden md:block w-px h-6 bg-white/10 shrink-0" />
          <h1 className="font-serif font-bold text-lg md:text-xl truncate text-gray-200 min-w-0">
            Curating path for: <span className="text-accent ml-2 capitalize">{query.replace(/-/g, ' ')}</span>
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-12 md:py-16">
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center py-20 text-center fade-in-up">
            <div className="mb-8">
              <SquareLoader />
            </div>
            <h2 className="text-2xl font-serif font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
              Finding best sources
            </h2>
            <WordCycleLoader />
          </div>
        }>
          <PathRenderer query={query} />
        </Suspense>
      </main>
    </div>
  );
}

async function PathRenderer({ query }: { query: string }) {
  // This triggers the server action to hit Gemini, YouTube, and Web APIs
  const pathData = await generatePath(query);

  if ('error' in pathData) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl text-center">
        <h3 className="font-bold text-lg mb-2">Failed to curate path</h3>
        <p className="text-sm opacity-80">{pathData.error}</p>
      </div>
    );
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: pathData.subjectName,
    description: pathData.overview,
    provider: {
      '@type': 'Organization',
      name: 'Quad Encode',
      sameAs: 'https://quadencode.com'
    },
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'Online',
    }
  };

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
        <div className="flex-shrink-0 flex justify-center md:justify-end">
          <SavePathButton pathData={pathData} />
        </div>
      </div>

      <PathTimeline resources={pathData.resources} />
    </div>
  );
}
