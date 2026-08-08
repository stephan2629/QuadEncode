'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createNote } from './actions';

export default function CreateNoteForm({ subjectId }: { subjectId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [createdNoteId, setCreatedNoteId] = useState<string | null>(null);

  useEffect(() => {
    const clearDeletedNoteAlert = (event: Event) => {
      if ((event as CustomEvent<string>).detail === createdNoteId) {
        setCreatedNoteId(null);
      }
    };
    window.addEventListener('dashboard-note-deleted', clearDeletedNoteAlert);
    return () => window.removeEventListener('dashboard-note-deleted', clearDeletedNoteAlert);
  }, [createdNoteId]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = (fd.get('title') as string).trim();
    if (!title) return;

    startTransition(async () => {
      const result = await createNote(fd);
      if (result?.error) {
        toast.error(result.error);
      } else {
        setCreatedNoteId(result?.id ?? null);
        toast.success('New note created');
        // Clear the input so the user can immediately add another note
        if (inputRef.current) inputRef.current.value = '';
      }
    });
  }

  return (
    <div className="mt-8 pt-6 border-t border-white/5 relative z-10 max-w-lg">
      {createdNoteId && (
        <p role="status" aria-live="polite" className="mb-3 rounded-lg border border-green-400/30 bg-green-500/10 px-3 py-2 text-sm text-green-200">
          New note created
        </p>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2 sm:gap-4">
        <input type="hidden" name="subjectId" value={subjectId} />
        <input
          ref={inputRef}
          type="text"
          name="title"
          aria-label="New note title"
          placeholder="New note title…"
          required
          disabled={isPending}
          className="bg-[#1a1815] border border-white/5 rounded-lg px-4 py-2 flex-1 min-w-0 text-base md:text-sm focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 text-white placeholder-gray-600 disabled:opacity-60"
        />
        <button
          type="submit"
          aria-label="Add note"
          disabled={isPending}
          className="text-[#0a0908] bg-accent hover:bg-accent/90 px-4 py-2 min-h-[44px] rounded-lg transition-colors font-medium flex items-center gap-2 text-sm whitespace-nowrap shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="w-4 h-4" aria-hidden="true" />
          )}
          Create note
        </button>
      </form>
    </div>
  );
}
