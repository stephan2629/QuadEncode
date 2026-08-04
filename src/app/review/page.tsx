import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import ReviewSession from './ReviewSession';
import CompletionScreen from './CompletionScreen';
import ReviewModeSelector from './ReviewModeSelector';

import { cookies } from 'next/headers';

const SESSION_CAP = 5;

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ subject_id?: string; mode?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const resolvedSearchParams = await searchParams;
  const cookieStore = await cookies();
  const subjectId = resolvedSearchParams.subject_id || cookieStore.get('active_subject_id')?.value;

  if (!subjectId) redirect('/dashboard');

  const mode = resolvedSearchParams.mode;
  if (!mode || (mode !== 'flashcards' && mode !== 'quiz')) {
    return <ReviewModeSelector subjectId={subjectId} />;
  }

  // Resolved to a plain note-id list first, rather than filtering cards
  // through an embedded `notes!inner(subject_id)` join - that dot-notation
  // embedded filter is fragile (silently returns zero rows on some
  // PostgREST/RLS combinations with no error surfaced) and a plain `.in()`
  // on note_id is unambiguous.
  const { data: subjectNotes, error: notesError } = await supabase
    .from('notes')
    .select('id')
    .eq('subject_id', subjectId);

  if (notesError) {
    console.error('Error fetching notes for review:', notesError.message);
  }

  const noteIds = (subjectNotes ?? []).map((n) => n.id);

  if (noteIds.length === 0) {
    return <CompletionScreen />;
  }

  const columns = 'id, note_id, line, tier, type, prompt, answer, explanation, video_id, t, box, due, fails';

  // Multiple-choice-ness is detected from the pipe-separated answer, never
  // from the type column (section 6) - quiz blanks are stored as type
  // 'basic', so filtering the query by type='quiz' would always return
  // nothing. Filter in JS after fetching instead.
  const isQuizCard = (c: { answer: string }) => c.answer.includes('|');

  // Box 0 cards jump the queue (section 8) and are always shown first.
  const { data: boxZero, error: boxZeroError } = await supabase
    .from('cards')
    .select(columns)
    .eq('box', 0)
    .in('note_id', noteIds)
    .order('due', { ascending: true });

  if (boxZeroError) console.error('Error fetching box-0 cards for review:', boxZeroError.message);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const { data: due, error: dueError } = await supabase
    .from('cards')
    .select(columns)
    .gt('box', 0)
    .lt('box', 5)
    .lte('due', endOfToday.toISOString())
    .in('note_id', noteIds)
    .order('due', { ascending: true });

  if (dueError) console.error('Error fetching due cards for review:', dueError.message);

  const all = [...(boxZero ?? []), ...(due ?? [])];
  const filtered = mode === 'quiz' ? all.filter(isQuizCard) : all.filter((c) => !isQuizCard(c));
  const queue = filtered.slice(0, SESSION_CAP);

  if (queue.length === 0) {
    return <CompletionScreen />;
  }

  return <ReviewSession initialQueue={queue} />;
}
