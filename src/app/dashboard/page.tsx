import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Book, Plus } from 'lucide-react';
import { createSubject } from './actions';
import CreateNoteForm from './CreateNoteForm';
import { logout } from '../login/actions';
import DeleteSubjectButton from './DeleteSubjectButton';
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
  created_at: string | null;
  updated_at: string | null;
  cards: { type: string }[] | null;
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
        .select('id, title, section, created_at, updated_at, cards (type)')
        .eq('subject_id', activeSubject.id),
    ]);

    paths = pathsResult.data as PathData[] | null;
    if (notesResult.error?.message.includes('notes.created_at')) {
      // The timestamp migration may be deployed after this app build. Keep
      // the dashboard usable against that older schema; created dates appear
      // automatically once the migration has been applied.
      const { data: legacyNotes, error: legacyNotesError } = await supabase
        .from('notes')
        .select('id, title, section, updated_at, cards (type)')
        .eq('subject_id', activeSubject.id);
      if (legacyNotesError) console.error('Error fetching notes:', legacyNotesError.message);
      notes = (legacyNotes ?? []) as DashboardNote[];
    } else {
      if (notesResult.error) console.error('Error fetching notes:', notesResult.error.message);
      notes = (notesResult.data ?? []) as DashboardNote[];
    }

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
            <Link href="/" className="font-serif text-xl font-bold tracking-tight text-accent flex items-center gap-2 whitespace-nowrap shrink-0 min-h-[44px]">
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
            <Link href="/" className="font-serif text-2xl font-bold tracking-tight text-accent flex items-center gap-2 whitespace-nowrap shrink-0 min-h-[44px]">
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
              aria-label="New subject name"
              placeholder="New subject name..."
              required
              className="flex-1 bg-[#1a1815] border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 text-base md:text-sm"
            />
            <button type="submit" className="bg-accent text-[#0a0908] hover:bg-accent/90 rounded-lg px-4 py-2 min-h-[44px] text-sm font-bold transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create
            </button>
          </form>
        </div>
      ) : (
        <>
          {/* Stacked until lg, same reason as the hero banner: at 768 the
              add-subject form took its natural width and left the heading
              about 330px, which wrapped a two-word subject name across two
              lines next to a half-empty row. */}
          <div className="mb-8 md:mb-12 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 lg:gap-0">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-3xl md:text-4xl font-bold font-serif">{activeSubject.name}</h1>
                <DeleteSubjectButton id={activeSubject.id} name={activeSubject.name} />
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
            
            <form action={createSubject} className="flex gap-2 w-full lg:w-auto">
              <input 
                type="text" 
                name="name" 
                aria-label="New subject name"
                placeholder="New subject..."
                required
                className="flex-1 lg:flex-none min-w-0 bg-[#14120f] border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 text-base md:text-sm"
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

            {/* gap-2 on a phone and a non-wrapping button: at 375 the label
                broke onto two lines and the button pushed past the card's
                own padding. min-w-0 lets the flex-1 input actually shrink
                below its content width instead of forcing the overflow. */}
            <CreateNoteForm subjectId={activeSubject.id} />
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
