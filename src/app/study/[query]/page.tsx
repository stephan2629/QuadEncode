import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { generatePath } from './actions';
import { getHardcodedCertPath } from '@/lib/certPaths';
import PathResult from './PathResult';
import WordCycleLoader from '@/components/ui/WordCycleLoader';
import SquareLoader from '@/components/ui/SquareLoader';
import Footer from '@/components/ui/Footer';

// ISR per CLAUDE.md section 16 ("generated at build time or with ISR,
// never client side"). The Serper + YouTube + Gemini + link-check pipeline
// in generatePath() measured at 21.5s in production - without this, every
// single visitor (including Google's crawler) paid that cost on every
// request, because calling a 'use server' action directly from this page
// for data made the whole route fully dynamic. A week matches how often a
// curated resource list actually goes stale; the first visitor after that
// window pays the 21s once, everyone else gets the cached page instantly.
export const revalidate = 604800;

// The actual missing piece, found by isolated testing (docs/decisions/0008):
// a dynamic segment with no generateStaticParams never enters Next's ISR
// system at all in this Next version, regardless of `revalidate` - every
// request re-renders from scratch no matter what the render itself does or
// doesn't fetch. Returning [] (no params known at build time) is enough to
// register the route; `dynamicParams` defaults to true, so an unknown slug
// still renders on first request and gets cached from then on.
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ query: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const decodedQuery = decodeURIComponent(resolvedParams.query).replace(/-/g, ' ');
  // Title-casing the slug turns "comptia-security-plus" into "Comptia
  // Security Plus", which is not what the exam is called. A pinned
  // certification knows its own name, so use that when there is one.
  const titleName =
    getHardcodedCertPath(resolvedParams.query)?.subjectName ??
    decodedQuery.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
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
          {/* Icon-only link: without an explicit label its accessible name
              is empty, which Lighthouse flags as link-name and a screen
              reader reads as just "link". */}
          <Link href="/" aria-label="Back to home" className="text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full shrink-0">
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

      <Footer />
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

  return <PathResult query={query} initialPath={pathData} />;
}
