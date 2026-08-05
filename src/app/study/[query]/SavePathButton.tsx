'use client';

import { useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';
import { saveGeneratedPath } from '@/app/dashboard/actions';
import type { GeneratedPath } from './actions';

export default function SavePathButton({ pathData }: { pathData: GeneratedPath }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Store the generated path in sessionStorage for post-login save
        sessionStorage.setItem('pendingPathSave', JSON.stringify(pathData));
        router.push('/login?next=/dashboard');
        return;
      }

      // User is logged in - save directly
      const result = await saveGeneratedPath(pathData);

      if (result?.limitReached) {
        toast.error(result.error || 'Limit reached: Maximum 3 active paths allowed.');
        setLoading(false);
        return;
      }

      toast.success('Learning path saved!');
      router.push('/dashboard');
    } catch (err: unknown) {
      console.error('Error saving path:', err);
      toast.error('Failed to save learning path');
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleSave}
      disabled={loading}
      className="text-xs md:text-sm font-semibold text-[#0a0908] bg-accent hover:bg-amber-400 px-4 md:px-5 py-2 rounded-full transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-70"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" /> Saving...
        </>
      ) : (
        <>
          <Save className="w-4 h-4" /> Save path
        </>
      )}
    </button>
  );
}
