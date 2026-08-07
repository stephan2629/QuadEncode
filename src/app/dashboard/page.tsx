import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Book, Plus, Trash2 } from 'lucide-react';
import { createSubject, createNote, deleteSubject } from './actions';
import { logout } from '../login/actions';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { SubjectSwitcher } from '@/components/ui/SubjectSwitcher';
import AccountMenu from '@/components/ui/AccountMenu';
import PendingPathSaver from './PendingPathSaver';
import PathTracker, { type PathData } from './PathTracker';
import NotesGrid from './NotesGrid';
import SubjectNav from './SubjectNav';
import Footer from '@/components/ui/Footer';
import StudyHeatmap from '@/components/ui/StudyHeatmap';
import { DashboardHeroBanner } from '@/components/ui/DashboardHeroBanner';
import { QuickStudyHub } from '@/components/ui/QuickStudyHub';

// Shape of the per-subject notes query below. Declared rather than inferred
// because `notes` is assigned inside a conditional block and read from JSX
// outside it.
type DashboardNote = {
  id: string;
  title: string;
  section: string | null;
  body_md: string | null;
  updated_at: string | null;
  cards: { type: string; answer: string }[] | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const userName = user.user_metadata?.name || user.user_metadata?.full_name || null;

  // Subjects only, no embedded notes. Every subject's notes used to be
  // embedded here, which meant one dashboard load pulled the full body_md of
  // every note in every subject (plus every card's answer text) and then
  // rendered exactly one subject's worth - the rest was fetched, sent over
  // the wire, and discarded. The active subject's notes are fetched on their
  // own below, once that subject is known.
  const { data: subjects, error } = await supabase
    .from('subjects')
    .select('id, name, slug, created_at')
    .order('created_at', { ascending: false });

  if (error) console.error('Error fetching subjects:', error);

  const cookieStore = await cookies();
  const savedSubjectId = cookieStore.get('active_subject_id')?.value;
  
  let activeSubject = subjects?.find(s => s.id === savedSubjectId);
  if (!activeSubject && subjects && subjects.length > 0) {
    activeSubject = subjects[0];
  }

  // Fetch 70 days of review history for heatmap
  const seventyDaysAgo = new Date();
  seventyDaysAgo.setDate(seventyDaysAgo.getDate() - 70);
  const { data: reviewsData } = await supabase
    .from('reviews')
    .select('reviewed_at')
    .gte('reviewed_at', seventyDaysAgo.toISOString());
  const reviewDates = (reviewsData || []).map(r => r.reviewed_at);

  // Global across all subjects, matching the limit saveGeneratedPath enforces
  // in src/app/dashboard/actions.ts (3 active paths total, not per subject).
  const { count: pathCount } = await supabase
    .from('paths')
    .select('id', { count: 'exact', head: true });

  let totalCards = 0;
  let dueCount = 0;
  let importCount = 0;
  let paths: PathData[] | null = null;
  let notes: DashboardNote[] = [];

  if (activeSubject) {
    // Paths and notes don't depend on each other, so they go out together
    // rather than one after the other - this keeps splitting the notes out
    // of the subjects query above from costing an extra sequential round
    // trip.
    const [pathsResult, notesResult] = await Promise.all([
      supabase
        .from('paths')
        .select(`
          id,
          subject_id,
          subjects ( name, slug ),
          path_steps (
            id,
            order,
            status,
            resources (
              id,
              title,
              url,
              provider,
              format,
              is_free,
              cost
            )
          )
        `)
        .eq('subject_id', activeSubject.id)
        .order('generated_at', { ascending: false }),
      supabase
        .from('notes')
        .select('id, title, section, body_md, updated_at, cards (type, answer)')
        .eq('subject_id', activeSubject.id),
    ]);

    paths = pathsResult.data as PathData[] | null;
    if (notesResult.error) console.error('Error fetching notes:', notesResult.error.message);
    notes = (notesResult.data ?? []) as DashboardNote[];

    // Resolved to a plain note-id list rather than filtering cards through an
    // embedded `notes!inner(subject_id)` join - that dot-notation embedded
    // filter is fragile (silently returns zero rows on some PostgREST/RLS
    // combinations with no error surfaced) and a plain `.in()` is unambiguous.
    const noteIds = notes.map((n) => n.id);

    if (noteIds.length > 0) {
      // Total Cards for Subject
      const { count: totalCountRaw, error: totalCardsError } = await supabase
        .from('cards')
        .select('id', { count: 'exact', head: true })
        .in('note_id', noteIds);
      if (totalCardsError) console.error('Error counting cards:', totalCardsError.message);
      totalCards = totalCountRaw ?? 0;

      // Due Cards for Subject (Box 0 plus Box 1-4 due)
      try {
        const { count: boxZeroCount } = await supabase
          .from('cards')
          .select('id', { count: 'exact', head: true })
          .eq('box', 0)
          .in('note_id', noteIds);

        const { count: dueBoxGte1Count } = await supabase
          .from('cards')
          .select('id', { count: 'exact', head: true })
          .gt('box', 0)
          .lt('box', 5)
          .lte('due', new Date().toISOString())
          .in('note_id', noteIds);

        dueCount = (boxZeroCount ?? 0) + (dueBoxGte1Count ?? 0);
      } catch (err) {
        console.error('Error counting due cards:', err);
      }
    }

    // Imports for Subject
    const { count: importCountRaw } = await supabase
      .from('imports')
      .select('id', { count: 'exact', head: true })
      .eq('subject_id', activeSubject.id);
    importCount = importCountRaw ?? 0;
  }

  return (
    <div className="h-dvh w-full bg-[#0a0908] text-white overflow-hidden flex flex-col">
      <div data-dashboard-scroll className="flex-1 overflow-y-auto w-full p-4 sm:p-6 md:p-12 max-w-6xl mx-auto custom-scrollbar">
      <PendingPathSaver />
      
      <header className="mb-10 md:mb-16">
        {/* Two independent layouts, toggled by display, rather than one
            markup block reflowed with CSS order across the breakpoint:
            mobile pairs the logo with the account menu on row one (top
            right, subject switcher gets its own row below); desktop pairs
            the logo with the subject switcher instead. Those are two
            different groupings, not the same group in a different order,
            so there's no single flex/order trick that produces both from
            one tree - two small, individually simple blocks beats one
            clever one here. */}
        <div className="sm:hidden flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <Link href="/" className="font-serif text-xl font-bold tracking-tight text-accent flex items-center gap-2 whitespace-nowrap shrink-0">
              <Image src="/logo.png" alt="Quad Encode Logo" width={32} height={32} className="w-6 h-6" /> Quad Encode
            </Link>
            <AccountMenu
              email={user.email ?? ''}
              name={userName}
              onLogout={logout}
            />
          </div>

          {subjects && subjects.length > 0 && activeSubject && (
            <SubjectSwitcher subjects={subjects} activeSubjectId={activeSubject.id} />
          )}
        </div>

        <div className="hidden sm:flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-serif text-2xl font-bold tracking-tight text-accent flex items-center gap-2 whitespace-nowrap shrink-0">
              <Image src="/logo.png" alt="Quad Encode Logo" width={32} height={32} className="w-8 h-8" /> Quad Encode
            </Link>

            <div className="h-6 w-px bg-white/10" />

            {subjects && subjects.length > 0 && activeSubject && (
              <SubjectSwitcher subjects={subjects} activeSubjectId={activeSubject.id} />
            )}
          </div>

          <AccountMenu
            email={user.email ?? ''}
            name={user.user_metadata?.name || user.user_metadata?.full_name || null}
            onLogout={logout}
          />
        </div>
      </header>

      <DashboardHeroBanner
        subjectName={activeSubject?.name}
        userName={userName}
        totalCards={totalCards}
        dueCount={dueCount}
        noteCount={notes.length}
      />

      <QuickStudyHub
        activeSubjectId={activeSubject?.id}
        dueCount={dueCount}
        hasCards={totalCards > 0}
        pathCount={pathCount ?? 0}
      />

      {/* Progress and stats appear only once there's enough to show, per
          CLAUDE.md section 3: "five or more cards/reviews exist". */}
      {totalCards >= 5 && (
        <div className="mb-12">
          <StudyHeatmap reviewDates={reviewDates} />
        </div>
      )}

      <main>
      {!activeSubject ? (
        <div className="text-center py-20 border border-white/5 rounded-2xl bg-[#14120f] border-dashed">
          <Book className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-300 mb-2">No subjects yet</h3>
          <p className="text-gray-500 mb-6">Create your first subject below to start taking notes.</p>
          <form action={createSubject} className="flex justify-center gap-2 max-w-md mx-auto">
            <input 
              type="text" 
              name="name" 
              placeholder="New subject name..."
              required
              className="flex-1 bg-[#1a1815] border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-accent text-base md:text-sm"
            />
            <button type="submit" className="bg-accent text-[#0a0908] hover:bg-accent/90 rounded-lg px-4 py-2 min-h-[44px] text-sm font-bold transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create
            </button>
          </form>
        </div>
      ) : (
        <>
          <div className="mb-8 md:mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 md:gap-0">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-3xl md:text-4xl font-bold font-serif">{activeSubject.name}</h1>
                <form action={deleteSubject}>
                  <input type="hidden" name="id" value={activeSubject.id} />
                  <ConfirmButton
                    confirmTitle="Delete subject?"
                    confirmMessage={`Delete "${activeSubject.name}" and all its notes? This can't be undone.`}
                    aria-label={`Delete ${activeSubject.name}`}
                    className="text-gray-500 hover:text-red-400 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    <Trash2 className="w-5 h-5" aria-hidden="true" />
                  </ConfirmButton>
                </form>
              </div>
              
              {totalCards > 0 || importCount > 0 ? (
                <SubjectNav
                  subjectId={activeSubject.id}
                  dueCount={dueCount}
                  totalCards={totalCards}
                  importCount={importCount}
                />
              ) : (
                <p className="text-sm md:text-base text-gray-400 mt-2">Start taking notes to generate flashcards.</p>
              )}
            </div>
            
            <form action={createSubject} className="flex gap-2 w-full md:w-auto">
              <input 
                type="text" 
                name="name" 
                placeholder="New subject..."
                required
                className="flex-1 md:flex-none bg-[#14120f] border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-accent text-base md:text-sm"
              />
              <button type="submit" className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-4 py-2 min-h-[44px] text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap">
                <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add subject</span>
              </button>
            </form>
          </div>

          <PathTracker key={activeSubject.id} initialPaths={paths ?? []} />

          <div className="bg-[#14120f] border border-white/10 rounded-2xl p-6 flex flex-col relative overflow-hidden group mt-6">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none"></div>
            
            <h2 className="text-xl font-bold font-serif text-white mb-6 relative z-10">Notes</h2>

            <div className="flex-1 relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <NotesGrid notes={notes} />
            </div>

            <form action={createNote} className="mt-8 pt-6 border-t border-white/5 relative z-10 flex gap-4 max-w-lg">
              <input type="hidden" name="subjectId" value={activeSubject.id} />
              <input
                type="text"
                name="title"
                aria-label="New note title"
                placeholder="New note title…"
                required
                className="bg-[#1a1815] border border-white/5 rounded-lg px-4 py-2 flex-1 text-base md:text-sm focus:outline-none focus:border-accent/50 text-white placeholder-gray-600"
              />
              <button type="submit" aria-label="Add note" className="text-[#0a0908] bg-accent hover:bg-accent/90 px-4 py-2 min-h-[44px] rounded-lg transition-colors font-medium flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4" aria-hidden="true" /> Create note
              </button>
            </form>
          </div>
        </>
      )}
      </main>

      {/* Inside the scroll container, not a sibling of it: the page root is
          h-dvh/overflow-hidden, so a footer outside would pin itself to the
          bottom of the viewport as a permanent bar instead of sitting at the
          end of the content. */}
      <Footer />
      </div>
    </div>
  );
}
