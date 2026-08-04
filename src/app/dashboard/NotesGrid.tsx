'use client';

import { m } from "framer-motion";
import Link from 'next/link';
import { FileText, Trash2 } from 'lucide-react';
import { deleteNote } from './actions';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { TiltCard } from '@/components/ui/TiltCard';

interface Note {
  id: string;
  title: string;
}

export default function NotesGrid({ notes }: { notes: Note[] }) {
  if (notes.length === 0) {
    return <p className="text-gray-500 text-sm italic col-span-full">No notes yet.</p>;
  }

  return (
    <>
      {notes.map((note, i) => (
        <m.div
          key={note.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.12, delay: i * 0.04 }}
          className="perspective-[1000px]"
        >
          <TiltCard tiltAmount={5} className="flex items-center justify-between group/note bg-[#1a1815] p-3 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
            <Link
              href={`/notes/${note.id}`}
              className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors flex-1 min-w-0 text-sm"
            >
              <FileText className="w-5 h-5 text-accent/60" />
              <span className="truncate font-medium">{note.title}</span>
            </Link>
            <form action={deleteNote}>
              <input type="hidden" name="id" value={note.id} />
              <ConfirmButton
                confirmMessage={`Delete "${note.title}"? This can't be undone.`}
                aria-label="Delete note"
                className="text-gray-600 hover:text-red-400 p-2 md:p-1 rounded-lg hover:bg-white/5 transition-colors opacity-0 group-hover:opacity-100 min-w-[44px] min-h-[44px] flex items-center justify-center focus:opacity-100"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </ConfirmButton>
            </form>
          </TiltCard>
        </m.div>
      ))}
    </>
  );
}
