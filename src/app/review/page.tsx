import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import ReviewSession from './ReviewSession';
import CompletionScreen from './CompletionScreen';

import { cookies } from 'next/headers';

// --- Session rules ---------------------------------------------------------
// 20 cards maximum per subject per calendar day.
// Up to 10 flashcards (no pipe in answer) + up to 10 quizzes (pipe in answer).
// If one side has fewer than its 10-card allotment, the other side can absorb
// the slack up to the 20-card daily cap.
// Within each side: missed cards (fails > 0 OR box = 0) come before untouched
// cards. Both groups are shuffled randomly so the order is never deterministic.
// ---------------------------------------------------------------------------

const DAILY_CAP = 20;
const HALF_CAP = 10; // per-type allotment before slack absorption

// Fisher-Yates shuffle — server-side, no seeded dependency needed here because
// the queue is assembled fresh on every page load and randomness is the goal.
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Missed cards (box=0 are always new/failed; fails>0 are explicitly wrong) go
// first; within each group the order is random.
function missedFirst<T extends { box: number; fails: number }>(cards: T[]): T[] {
  const missed = shuffle(cards.filter((c) => c.box === 0 || c.fails > 0));
  const rest = shuffle(cards.filter((c) => c.box > 0 && c.fails === 0));
  return [...missed, ...rest];
}

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ subject_id?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const resolvedSearchParams = await searchParams;
  const cookieStore = await cookies();
  const subjectId =
    resolvedSearchParams.subject_id || cookieStore.get('active_subject_id')?.value;

  if (!subjectId) redirect('/dashboard');

  // ------------------------------------------------------------------
  // 1. Resolve note IDs for this subject (avoids fragile embedded join)
  // ------------------------------------------------------------------
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

  // ------------------------------------------------------------------
  // 2. Daily quota: count reviews submitted today for this subject's cards
  // ------------------------------------------------------------------
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const { count: reviewedToday } = await supabase
    .from('reviews')
    .select('id', { count: 'exact', head: true })
    .gte('reviewed_at', startOfToday.toISOString())
    .in(
      'card_id',
      // Sub-select: all card IDs belonging to this subject's notes
      (
        await supabase
          .from('cards')
          .select('id')
          .in('note_id', noteIds)
      ).data?.map((c) => c.id) ?? [],
    );

  const remainingQuota = DAILY_CAP - (reviewedToday ?? 0);

  if (remainingQuota <= 0) {
    // Daily cap reached — show completion screen with a quota message.
    return (
      <CompletionScreen
        quotaMessage={`You've reviewed ${DAILY_CAP} cards for this subject today. Come back tomorrow.`}
      />
    );
  }

  // ------------------------------------------------------------------
  // 3. Fetch all due cards for this subject
  // ------------------------------------------------------------------
  const columns =
    'id, note_id, line, tier, type, prompt, answer, explanation, video_id, t, box, due, fails';

  const isQuizCard = (c: { answer: string }) => c.answer.includes('|');

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  // Box 0 cards are always due (they are new or failed back to start)
  const { data: boxZero, error: boxZeroError } = await supabase
    .from('cards')
    .select(columns)
    .eq('box', 0)
    .in('note_id', noteIds);

  if (boxZeroError) console.error('Error fetching box-0 cards:', boxZeroError.message);

  // Scheduled cards due today (boxes 1–4)
  const { data: dueCards, error: dueError } = await supabase
    .from('cards')
    .select(columns)
    .gt('box', 0)
    .lt('box', 5)
    .lte('due', endOfToday.toISOString())
    .in('note_id', noteIds);

  if (dueError) console.error('Error fetching due cards:', dueError.message);

  const allDue = [...(boxZero ?? []), ...(dueCards ?? [])];

  if (allDue.length === 0) {
    return <CompletionScreen />;
  }

  // ------------------------------------------------------------------
  // 4. Split into flashcards vs quizzes, apply missed-first + shuffle
  // ------------------------------------------------------------------
  const flashcardPool = missedFirst(allDue.filter((c) => !isQuizCard(c)));
  const quizPool = missedFirst(allDue.filter((c) => isQuizCard(c)));

  // Each side gets up to HALF_CAP; unused allotment can flow to the other side,
  // but total is capped at remainingQuota (which is already ≤ DAILY_CAP).
  const effectiveCap = Math.min(remainingQuota, DAILY_CAP);
  const flashcards = flashcardPool.slice(0, Math.min(HALF_CAP, effectiveCap));
  const quizzes = quizPool.slice(0, Math.min(HALF_CAP, effectiveCap - flashcards.length));
  const overflow = missedFirst([
    ...flashcardPool.slice(flashcards.length),
    ...quizPool.slice(quizzes.length),
  ]);

  // Interleave: start with flashcards then quizzes so the session feels
  // varied without random ordering between the types.
  const queue = [...flashcards, ...quizzes, ...overflow].slice(0, effectiveCap);

  if (queue.length === 0) {
    return <CompletionScreen />;
  }

  return <ReviewSession initialQueue={queue} />;
}
