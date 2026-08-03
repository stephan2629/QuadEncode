'use client';

import { Save } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SavePathButton({ pathData }: { pathData: any }) {
  const router = useRouter();

  const handleSave = () => {
    // Store the generated path in sessionStorage
    sessionStorage.setItem('pendingPathSave', JSON.stringify(pathData));
    
    // Redirect to login (which should redirect to dashboard after auth)
    router.push('/login?next=/dashboard');
  };

  return (
    <button 
      onClick={handleSave}
      className="text-xs md:text-sm font-semibold text-[#0a0908] bg-accent hover:bg-accent-muted px-4 md:px-5 py-2 rounded-full transition-colors flex items-center gap-2"
    >
      <Save className="w-4 h-4" /> Save Path
    </button>
  );
}
