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

  const columns = 'id, note_id, line, tier, type, prompt, answer, explanation, box, due, fails, notes!inner(subject_id)';

  // Multiple-choice-ness is detected from the pipe-separated answer, never
  // from the type column (section 6) - quiz blanks are stored as type
  // 'basic', so filtering the query by type='quiz' would always return
  // nothing. Filter in JS after fetching instead.
  const isQuizCard = (c: { answer: string }) => c.answer.includes('|');

  // Box 0 cards jump the queue (section 8) and are always shown first.
  const { data: boxZero } = await supabase
    .from('cards')
    .select(columns)
    .eq('box', 0)
    .eq('notes.subject_id', subjectId)
    .order('due', { ascending: true });

  const { data: due } = await supabase
    .from('cards')
    .select(columns)
    .gt('box', 0)
    .lt('box', 5)
    .lte('due', new Date().toISOString())
    .eq('notes.subject_id', subjectId)
    .order('due', { ascending: true });

  const all = [...(boxZero ?? []), ...(due ?? [])];
  const filtered = mode === 'quiz' ? all.filter(isQuizCard) : all.filter((c) => !isQuizCard(c));
  const queue = filtered.slice(0, SESSION_CAP);

  if (queue.length === 0) {
    return <CompletionScreen />;
  }

  return <ReviewSession initialQueue={queue} />;
}
