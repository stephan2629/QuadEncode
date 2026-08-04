export default function NoteLoading() {
  return (
    <div className="flex flex-col h-screen bg-[#14120f]">
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/5 bg-[#14120f]/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-white/5 animate-pulse" />
          <div className="h-6 w-32 bg-white/5 rounded-lg animate-pulse" />
        </div>
      </header>
      <main className="w-full max-w-6xl mx-auto p-4 sm:p-6 md:p-12 flex-1 animate-pulse">
        {/* Title area */}
        <div className="flex flex-col gap-2 mb-8 border-b border-white/10 pb-6">
          <div className="h-10 w-2/3 md:w-1/2 bg-white/5 rounded-lg"></div>
          <div className="h-5 w-1/4 bg-white/5 rounded-lg"></div>
        </div>

        {/* Editor vs Flashcard Split */}
        <div className="flex flex-col lg:flex-row gap-8 lg:h-[calc(100vh-280px)] min-h-[600px]">
          {/* Editor Skeleton */}
          <div className="flex-1 bg-white/5 rounded-2xl border border-white/10 p-6 flex flex-col">
            <div className="space-y-4">
              <div className="h-6 w-3/4 bg-white/10 rounded"></div>
              <div className="h-4 w-full bg-white/10 rounded"></div>
              <div className="h-4 w-5/6 bg-white/10 rounded"></div>
              <div className="h-4 w-full bg-white/10 rounded"></div>
              <div className="h-4 w-2/3 bg-white/10 rounded"></div>
            </div>
          </div>

          {/* Flashcards Skeleton */}
          <div className="w-full lg:w-[500px] flex flex-col gap-6">
            <div className="h-[400px] bg-white/5 rounded-3xl border border-white/10 p-8 flex flex-col items-center justify-center">
               <div className="h-8 w-16 bg-white/10 rounded-full mb-8"></div>
               <div className="h-6 w-3/4 bg-white/10 rounded mb-4"></div>
               <div className="h-6 w-1/2 bg-white/10 rounded"></div>
            </div>
            
            {/* Toolbar Skeleton */}
            <div className="h-16 w-full bg-white/5 rounded-xl border border-white/10"></div>
          </div>
        </div>
      </main>
    </div>
  );
}
