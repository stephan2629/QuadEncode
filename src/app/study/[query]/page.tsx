import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Clock, PlayCircle, FileText, Loader2 } from 'lucide-react';
import { generatePath } from './actions';
import SavePathButton from './SavePathButton';

export default async function StudyPage({ params }: { params: { query: string } }) {
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
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
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

  if (pathData.error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl text-center">
        <h3 className="font-bold text-lg mb-2">Failed to curate path</h3>
        <p className="text-sm opacity-80">{pathData.error}</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
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

      <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-white/10 before:via-white/10 before:to-transparent">
        {pathData.resources.map((resource: any, index: number) => (
          <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
            {/* Timeline dot */}
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#0a0908] bg-[#14120f] shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-colors duration-300 group-hover:bg-accent/20 group-hover:border-accent/40">
              {resource.format === 'video' ? <PlayCircle className="w-4 h-4 text-accent" /> : <FileText className="w-4 h-4 text-accent" />}
            </div>

            {/* Content Card */}
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-2xl bg-[#14120f]/80 backdrop-blur-sm border border-white/5 hover:border-white/20 transition-all duration-300 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.03)] group-hover:-translate-y-1 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-accent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-mono text-gray-500 uppercase tracking-widest bg-black/40 px-2 py-1 rounded-md">
                  Step {index + 1}
                </span>
                {resource.isFree ? (
                  <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full font-medium">Free</span>
                ) : (
                  <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded-full font-medium">{resource.cost}</span>
                )}
              </div>
              
              <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 leading-tight">
                <a href={resource.url} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
                  {resource.title}
                </a>
              </h3>
              
              <div className="text-sm text-gray-400 mb-4 line-clamp-3">
                {resource.description}
              </div>
              
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md">
                  <BookOpen className="w-3.5 h-3.5" />
                  {resource.provider}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
