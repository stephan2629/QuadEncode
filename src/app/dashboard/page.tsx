import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Book, Plus, LogOut, FileText, Trash2 } from 'lucide-react';
import { createSubject, createNote, deleteSubject, deleteNote } from './actions';
import { logout, deleteAccount } from '../login/actions';
import { ConfirmButton } from '@/components/ui/ConfirmButton';

interface DashboardNote {
  id: string;
  title: string;
  section: string | null;
  updated_at: string;
}

interface DashboardSubject {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  notes: DashboardNote[];
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch subjects and their notes
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
        updated_at
      )
    `)
    .returns<DashboardSubject[]>()
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching subjects:', error);
  }

  const { count: totalCardsRaw } = await supabase
    .from('cards')
    .select('id', { count: 'exact', head: true });
  const totalCards = totalCardsRaw ?? 0;

  const { count: dueCountRaw } = await supabase
    .from('cards')
    .select('id', { count: 'exact', head: true })
    .or(`box.eq.0,and(box.gt.0,box.lt.5,due.lte.${new Date().toISOString()})`);
  const dueCount = dueCountRaw ?? 0;

  return (
    <div className="min-h-screen bg-[#0a0908] text-white p-4 sm:p-6 md:p-12 max-w-6xl mx-auto">
      <header className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0 mb-10 md:mb-16">
        <Link href="/" className="font-serif text-xl md:text-2xl font-bold tracking-tight text-accent flex items-center gap-2">
          <Book className="w-5 h-5 md:w-6 md:h-6" /> Quad Encode
        </Link>
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-gray-400 text-xs md:text-sm truncate max-w-[200px] sm:max-w-none">{user.email}</span>
          <form action={logout}>
            <button className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
              <LogOut className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </form>
        </div>
      </header>

      <div className="mb-8 md:mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 md:gap-0">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold font-serif mb-2">Your Dashboard</h1>
          {totalCards > 0 ? (
            <div className="flex items-center gap-4 mt-4 mb-2">
              {dueCount > 0 && (
                <span className="text-sm md:text-base text-accent bg-accent/10 px-3 py-1 rounded-full font-medium">
                  {dueCount} {dueCount === 1 ? 'card' : 'cards'} due
                </span>
              )}
              <Link
                href="/review"
                className={
                  dueCount > 0
                    ? 'text-sm md:text-base bg-accent text-[#0a0908] px-5 py-1.5 rounded-full font-bold hover:bg-accent/90 transition-colors'
                    : 'text-sm md:text-base text-gray-400 hover:text-white transition-colors'
                }
              >
                Review
              </Link>
            </div>
          ) : (
            <p className="text-sm md:text-base text-gray-400 mt-2">Manage your subjects and start taking notes.</p>
          )}
        </div>
        <form action={createSubject} className="flex gap-2 w-full md:w-auto">
          <input 
            type="text" 
            name="name" 
            placeholder="New Subject Name..." 
            required
            className="flex-1 md:flex-none bg-[#14120f] border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-accent text-sm"
          />
          <button type="submit" className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Create</span>
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects?.map((subject) => (
          <div key={subject.id} className="bg-[#14120f] border border-white/10 rounded-2xl p-6 flex flex-col h-full relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none"></div>
            
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-bold font-serif text-accent relative z-10">{subject.name}</h2>
              <form action={deleteSubject}>
                <input type="hidden" name="id" value={subject.id} />
                <ConfirmButton
                  confirmMessage={`Delete "${subject.name}" and all its notes? This can't be undone.`}
                  aria-label={`Delete ${subject.name}`}
                  className="text-gray-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </ConfirmButton>
              </form>
            </div>

            <div className="flex-1 space-y-2 relative z-10">
              {subject.notes && subject.notes.length > 0 ? (
                subject.notes.map((note) => (
                  <div key={note.id} className="flex items-center justify-between group/note">
                    <Link 
                      href={`/notes/${note.id}`}
                      className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors flex-1 text-sm py-1"
                    >
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="truncate">{note.title}</span>
                    </Link>
                    <form action={deleteNote}>
                      <input type="hidden" name="id" value={note.id} />
                      <ConfirmButton
                        confirmMessage={`Delete "${note.title}"? This can't be undone.`}
                        aria-label={`Delete ${note.title}`}
                        className="text-gray-600 hover:text-red-400 p-1 opacity-0 group-hover/note:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" aria-hidden="true" />
                      </ConfirmButton>
                    </form>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm italic">No notes yet.</p>
              )}
            </div>

            <form action={createNote} className="mt-6 pt-4 border-t border-white/5 relative z-10 flex gap-2">
              <input type="hidden" name="subjectId" value={subject.id} />
              <input
                type="text"
                name="title"
                aria-label="New note title"
                placeholder="New note title…"
                required
                className="bg-[#1a1815] border border-white/5 rounded-md px-3 py-1.5 flex-1 text-sm focus:outline-none focus:border-accent/50 text-white placeholder-gray-600"
              />
              <button type="submit" aria-label="Add note" className="text-accent hover:text-accent-muted p-1.5 bg-accent/10 rounded-md transition-colors">
                <Plus className="w-4 h-4" aria-hidden="true" />
              </button>
            </form>
          </div>
        ))}
      </div>
      
      {subjects?.length === 0 && (
        <div className="text-center py-20 border border-white/5 rounded-2xl bg-[#14120f] border-dashed">
          <Book className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-300 mb-2">No subjects yet</h3>
          <p className="text-gray-500">Create your first subject above to start taking notes.</p>
        </div>
      )}

      <footer className="mt-20 pt-8 border-t border-white/5 text-center">
        <form action={deleteAccount}>
          <ConfirmButton
            confirmMessage="Delete your account? All subjects, notes, cards, and review history are permanently removed. This can't be undone."
            className="text-xs text-gray-600 hover:text-red-400 transition-colors"
          >
            Delete account
          </ConfirmButton>
        </form>
      </footer>
    </div>
  );
}
