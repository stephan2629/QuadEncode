import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { buildPracticeQuestions, MIN_PRACTICE_CARDS } from '@/lib/practice';
import PracticeSession from './PracticeSession';

import { cookies } from 'next/headers';

export default async function PracticePage({ searchParams }: { searchParams: Promise<{ subject_id?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const resolvedSearchParams = await searchParams;
  const cookieStore = await cookies();
  const subjectId = resolvedSearchParams.subject_id || cookieStore.get('active_subject_id')?.value;

  if (!subjectId) redirect('/dashboard');

  const { data: cards } = await supabase
    .from('cards')
    .select('id, note_id, line, prompt, answer, notes!inner(subject_id)')
    .eq('notes.subject_id', subjectId);

  const questions = buildPracticeQuestions(cards ?? []);

  if (questions.length < MIN_PRACTICE_CARDS) {
    redirect('/dashboard');
  }

  return <PracticeSession questions={questions} />;
}
