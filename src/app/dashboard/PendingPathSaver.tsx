'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { saveGeneratedPath } from './actions';

// Lazy-initialized from sessionStorage so the "saving" state is derived up
// front instead of flipped on synchronously inside the effect body.
export default function PendingPathSaver() {
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const pendingData = sessionStorage.getItem('pendingPathSave');
    if (!pendingData) return;

    // We only try saving once
    sessionStorage.removeItem('pendingPathSave');

    // Single promise chain so a malformed-JSON error and a save error both
    // land in the same .catch, keeping every setState call inside an async
    // callback rather than synchronously in the effect body.
    Promise.resolve()
      .then(() => {
        setSaving(true);
        return JSON.parse(pendingData);
      })
      .then(saveGeneratedPath)
      .then((res: Awaited<ReturnType<typeof saveGeneratedPath>>) => {
        setSaving(false);
        if (res?.limitReached) {
          toast.error(res.error || 'Limit reached: Maximum 3 active paths allowed.');
        } else {
          toast.success('Learning path saved!');
        }
        router.refresh();
      })
      .catch((err) => {
        console.error("Failed to save path:", err);
        toast.error(err instanceof Error ? err.message : 'Could not save learning path. Try again.');
        setSaving(false);
      });
  }, [router]);

  if (!saving) return null;

  return (
    <div role="status" aria-live="polite" aria-busy="true" className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center">
      <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" aria-hidden="true" />
      <h2 className="text-xl font-bold font-serif text-white">Saving your curated path…</h2>
    </div>
  );
}
