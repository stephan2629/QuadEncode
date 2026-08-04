'use client';

import { m } from "framer-motion";
import Link from 'next/link';
import { FileText, Trash2 } from 'lucide-react';
import { deleteNote } from './actions';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { TiltCard } from '@/components/ui/TiltCard';

interface NoteCard {
  type: string;
  answer: string;
}

interface Note {
  id: string;
  title: string;
  section?: string | null;
  body_md?: string | null;
  updated_at?: string | null;
  cards?: NoteCard[] | null;
}

// Plain-text preview only - strips the markdown prefixes and punctuation a
// reader doesn't need to skim three sentences of a note.
function stripMarkdown(md: string): string {
  return md
    .replace(/\*\*(Vocab|Def|Quiz|A|Explain):\*\*/g, '')
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatUpdated(iso?: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function NotesGrid({ notes }: { notes: Note[] }) {
  if (notes.length === 0) {
    return <p className="text-gray-500 text-sm italic col-span-full">No notes yet.</p>;
  }

  return (
    <>
      {notes.map((note, i) => {
        const cards = note.cards ?? [];
        const vocabCount = cards.filter((c) => c.type === 'vocab').length;
        const quizCount = cards.filter((c) => c.answer.includes('|')).length;
        const snippet = note.body_md ? stripMarkdown(note.body_md) : '';
        const updated = formatUpdated(note.updated_at);

        return (
          <m.div
            key={note.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{
              type: "spring",
              stiffness: 350,
              damping: 25,
              delay: i * 0.04,
            }}
            className="perspective-[1000px]"
          >
            <TiltCard tiltAmount={5} className="group/note bg-white/5 backdrop-blur-md p-4 rounded-xl border border-white/10 hover:border-accent/40 hover:shadow-[0_0_25px_rgba(245,158,11,0.18)] transition-all duration-300">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/notes/${note.id}`}
                  className="flex items-start gap-3 text-gray-300 hover:text-white transition-colors flex-1 min-w-0 text-sm"
                >
                  <m.div
                    whileHover={{ rotate: 12, scale: 1.15 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <FileText className="w-5 h-5 text-accent/80 shrink-0 mt-0.5" aria-hidden="true" />
                  </m.div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate font-medium group-hover/note:text-accent transition-colors">{note.title}</span>
                      {note.section && (
                        <span className="text-xs text-gray-500 shrink-0">{note.section}</span>
                      )}
                    </div>
                    {snippet && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-3">{snippet}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {updated && <span className="text-[10px] text-gray-400 font-mono">{updated}</span>}
                      {vocabCount > 0 && (
                        <m.span
                          whileHover={{ scale: 1.08 }}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20 text-accent"
                        >
                          {vocabCount} vocab
                        </m.span>
                      )}
                      {quizCount > 0 && (
                        <m.span
                          whileHover={{ scale: 1.08 }}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400"
                        >
                          {quizCount} quiz
                        </m.span>
                      )}
                    </div>
                  </div>
                </Link>
                <form action={deleteNote}>
                  <input type="hidden" name="id" value={note.id} />
                  <ConfirmButton
                    confirmMessage={`Delete "${note.title}"? This can't be undone.`}
                    aria-label="Delete note"
                    className="text-gray-400 hover:text-red-400 p-2 md:p-1 rounded-lg hover:bg-white/5 transition-colors opacity-100 md:opacity-0 md:group-hover/note:opacity-100 min-w-[44px] min-h-[44px] flex items-center justify-center focus:opacity-100 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </ConfirmButton>
                </form>
              </div>
            </TiltCard>
          </m.div>
        );
      })}
    </>
  );
}
