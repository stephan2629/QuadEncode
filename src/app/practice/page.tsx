import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { buildPracticeQuestions, MIN_PRACTICE_CARDS } from '@/lib/practice';
import PracticeSession from './PracticeSession';

export default async function PracticePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: cards } = await supabase
    .from('cards')
    .select('id, note_id, line, prompt, answer');

  const questions = buildPracticeQuestions(cards ?? []);

  if (questions.length < MIN_PRACTICE_CARDS) {
    redirect('/dashboard');
  }

  return <PracticeSession questions={questions} />;
}
