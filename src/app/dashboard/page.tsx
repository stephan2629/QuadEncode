import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Book, Plus, LogOut, Trash2 } from 'lucide-react';
import { createSubject, createNote, deleteSubject } from './actions';
import { logout, deleteAccount } from '../login/actions';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { SubjectSwitcher } from '@/components/ui/SubjectSwitcher';
import PendingPathSaver from './PendingPathSaver';
import PathTracker, { type PathData } from './PathTracker';
import NotesGrid from './NotesGrid';
import SubjectNav from './SubjectNav';
import StudyHeatmap from '@/components/ui/StudyHeatmap';
import { DashboardHeroBanner } from '@/components/ui/DashboardHeroBanner';
import { QuickStudyHub } from '@/components/ui/QuickStudyHub';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch all subjects for the switcher
  const { data: subjects, error } = await supabase
    .from('subjects')
    .select(`
      id,
      name,
      slug,
      created_at,
      notes (
        id,
        title,
        section,
        body_md,
        updated_at,
        cards (type, answer)
      )
    `)
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

  let totalCards = 0;
  let dueCount = 0;
  let importCount = 0;
  let paths: PathData[] | null = null;

  if (activeSubject) {
    // Fetch active paths scoped to subject
    const { data: pData } = await supabase
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
      .order('generated_at', { ascending: false });
    paths = pData as PathData[] | null;

    // Resolved to a plain note-id list rather than filtering cards through an
    // embedded `notes!inner(subject_id)` join - that dot-notation embedded
    // filter is fragile (silently returns zero rows on some PostgREST/RLS
    // combinations with no error surfaced) and a plain `.in()` is unambiguous.
    const noteIds = (activeSubject.notes ?? []).map((n) => n.id);

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
      <div className="flex-1 overflow-y-auto w-full p-4 sm:p-6 md:p-12 max-w-6xl mx-auto custom-scrollbar">
      <PendingPathSaver />
      
      <header className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0 mb-10 md:mb-16">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-serif text-xl md:text-2xl font-bold tracking-tight text-accent flex items-center gap-2">
            <Image src="/logo.png" alt="Quad Encode Logo" width={32} height={32} className="w-6 h-6 md:w-8 md:h-8" /> Quad Encode
          </Link>
          
          <div className="hidden sm:block h-6 w-px bg-white/10" />
          
          {subjects && subjects.length > 0 && activeSubject && (
            <SubjectSwitcher subjects={subjects} activeSubjectId={activeSubject.id} />
          )}
        </div>
        
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-gray-400 text-xs md:text-sm truncate max-w-[200px] sm:max-w-none">{user.email}</span>
          <form action={logout}>
            <button
              className="p-3 sm:p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Sign out of your account"
              aria-label="Sign out of your account"
            >
              <LogOut className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </form>
        </div>
      </header>

      <DashboardHeroBanner
        subjectName={activeSubject?.name}
        totalCards={totalCards}
        dueCount={dueCount}
        noteCount={activeSubject?.notes?.length ?? 0}
      />

      <QuickStudyHub
        activeSubjectId={activeSubject?.id}
        dueCount={dueCount}
      />

      <div className="mb-12">
        <StudyHeatmap reviewDates={reviewDates} />
      </div>

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
            <button type="submit" className="bg-accent text-[#0a0908] hover:bg-accent/90 rounded-lg px-4 py-2 text-sm font-bold transition-colors flex items-center gap-2">
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
                    confirmMessage={`Delete "${activeSubject.name}" and all its notes? This can't be undone.`}
                    aria-label={`Delete ${activeSubject.name}`}
                    className="text-gray-500 hover:text-red-400 p-1 transition-colors"
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
              <button type="submit" className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap">
                <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add subject</span>
              </button>
            </form>
          </div>

          <PathTracker key={activeSubject.id} initialPaths={paths ?? []} />

          <div className="bg-[#14120f] border border-white/10 rounded-2xl p-6 flex flex-col relative overflow-hidden group mt-6">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none"></div>
            
            <h2 className="text-xl font-bold font-serif text-white mb-6 relative z-10">Notes</h2>

            <div className="flex-1 relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <NotesGrid notes={activeSubject.notes ?? []} />
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
              <button type="submit" aria-label="Add note" className="text-[#0a0908] bg-accent hover:bg-accent/90 px-4 py-2 rounded-lg transition-colors font-medium flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4" aria-hidden="true" /> Create note
              </button>
            </form>
          </div>
        </>
      )}
      </main>

      <footer className="mt-20 pt-8 border-t border-white/5 text-center">
        <form action={deleteAccount}>
          <ConfirmButton
            confirmMessage="Delete your account? All subjects, notes, cards, and review history are permanently removed. This can't be undone."
            className="text-xs text-gray-400 hover:text-red-400 transition-colors"
          >
            Delete account
          </ConfirmButton>
        </form>
      </footer>
      </div>
    </div>
  );
}
