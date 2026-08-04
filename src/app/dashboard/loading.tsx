export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#0a0908] text-white p-4 sm:p-6 md:p-12 max-w-6xl mx-auto flex flex-col items-center">
      <header className="w-full flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0 mb-10 md:mb-16">
        <div className="flex items-center gap-6">
          <div className="h-8 w-48 bg-white/5 rounded-lg animate-pulse" />
        </div>
        <div className="h-10 w-10 bg-white/5 rounded-lg animate-pulse" />
      </header>
      <main className="w-full flex-1 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <div className="h-10 w-48 bg-white/5 rounded-lg mb-2"></div>
            <div className="h-5 w-64 bg-white/5 rounded-lg"></div>
          </div>
          <div className="h-12 w-32 bg-white/5 rounded-lg"></div>
        </div>

        {/* Path Tracker Skeleton */}
        <div className="w-full bg-white/5 rounded-2xl h-48 mb-12"></div>

        {/* Notes Grid Skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-32 bg-white/5 rounded-lg"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white/5 backdrop-blur-md p-4 rounded-xl border border-white/10 h-32">
              <div className="flex items-start gap-3 h-full">
                <div className="w-5 h-5 bg-white/10 rounded shrink-0"></div>
                <div className="flex-1 w-full space-y-2">
                  <div className="h-5 w-3/4 bg-white/10 rounded"></div>
                  <div className="h-3 w-1/4 bg-white/10 rounded"></div>
                  <div className="h-3 w-full bg-white/10 rounded mt-4"></div>
                  <div className="h-3 w-5/6 bg-white/10 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
