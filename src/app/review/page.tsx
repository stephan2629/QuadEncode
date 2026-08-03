import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import ReviewSession from './ReviewSession';
import CompletionScreen from './CompletionScreen';

const SESSION_CAP = 20;

export default async function ReviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const columns = 'id, note_id, line, tier, type, prompt, answer, box, due, fails';

  // Box 0 cards jump the queue (section 8) and are always shown first.
  const { data: boxZero } = await supabase
    .from('cards')
    .select(columns)
    .eq('box', 0)
    .order('due', { ascending: true });

  const { data: due } = await supabase
    .from('cards')
    .select(columns)
    .gt('box', 0)
    .lt('box', 5)
    .lte('due', new Date().toISOString())
    .order('due', { ascending: true });

  const queue = [...(boxZero ?? []), ...(due ?? [])].slice(0, SESSION_CAP);

  if (queue.length === 0) {
    return <CompletionScreen />;
  }

  return <ReviewSession initialQueue={queue} />;
}
