'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { saveGeneratedPath } from './actions';

export default function PendingPathSaver() {
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const pendingData = sessionStorage.getItem('pendingPathSave');
    if (pendingData) {
      setSaving(true);
      try {
        const pathData = JSON.parse(pendingData);
        // We only try saving once
        sessionStorage.removeItem('pendingPathSave');
        
        saveGeneratedPath(pathData).then(() => {
          setSaving(false);
          router.refresh();
        }).catch(err => {
          console.error("Failed to save path:", err);
          setSaving(false);
        });
      } catch (err) {
        setSaving(false);
        sessionStorage.removeItem('pendingPathSave');
      }
    }
  }, [router]);

  if (!saving) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center">
      <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
      <h2 className="text-xl font-bold font-serif text-white">Saving your curated path...</h2>
    </div>
  );
}
