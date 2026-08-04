import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0908] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mb-6 border border-accent/20">
        <FileQuestion className="w-8 h-8 text-accent" />
      </div>
      <h2 className="text-3xl font-bold font-serif mb-4 text-gray-100">Page Not Found</h2>
      <p className="text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
        We couldn&apos;t find the page you were looking for. It might have been moved or deleted.
      </p>
      
      <Link 
        href="/"
        className="bg-accent text-[#0a0908] font-bold px-8 py-3 rounded-xl hover:bg-accent/90 transition-colors active:scale-95"
      >
        Return Home
      </Link>
    </div>
  );
}
