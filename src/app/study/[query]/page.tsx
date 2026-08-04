import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { generatePath } from './actions';
import SavePathButton from './SavePathButton';
import PathTimeline from '@/components/ui/PathTimeline';

export async function generateMetadata({ params }: { params: Promise<{ query: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const decodedQuery = decodeURIComponent(resolvedParams.query).replace(/-/g, ' ');
  const titleName = decodedQuery.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return {
    title: `Study ${titleName} - Quad Encode Learning Path`,
    description: `Get a free, AI-curated learning path to study ${titleName}. Ranked resources, video courses, and more.`,
  };
}

export default async function StudyPage({ params }: { params: Promise<{ query: string }> }) {
  const { query } = await params;
  
  return (
    <div className="min-h-screen bg-[#0a0908] text-white">
      <header className="sticky top-0 z-50 bg-[#0a0908]/80 backdrop-blur-xl border-b border-white/10 px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="hidden md:block w-px h-6 bg-white/10" />
          <h1 className="font-serif font-bold text-lg md:text-xl truncate text-gray-200">
            Curating path for: <span className="text-accent ml-2 capitalize">{query.replace(/-/g, ' ')}</span>
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-12 md:py-16">
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center py-20 text-center fade-in-up">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full animate-pulse" />
              <Loader2 className="w-12 h-12 text-accent animate-spin relative z-10" />
            </div>
            <h2 className="text-2xl font-serif font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
              Analyzing the best resources...
            </h2>
            <p className="text-gray-400 max-w-md mx-auto text-sm">
              We are interpreting your query, fetching top-rated YouTube courses and web documentation, and using AI to curate the optimal learning path for you. This takes about 10 seconds.
            </p>
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
