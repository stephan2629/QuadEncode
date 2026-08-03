import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Book, Plus, LogOut, FileText, Trash2 } from 'lucide-react';
import { createSubject, createNote, deleteSubject, deleteNote } from './actions';
import { logout } from '../login/actions';

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

  return (
    <div className="min-h-screen bg-[#0a0908] text-white p-6 md:p-12 max-w-6xl mx-auto">
      <header className="flex justify-between items-center mb-16">
        <Link href="/" className="font-serif text-2xl font-bold tracking-tight text-accent flex items-center gap-2">
          <Book className="w-6 h-6" /> Quad Encode
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm hidden md:inline-block">{user.email}</span>
          <form action={logout}>
            <button className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </form>
        </div>
      </header>

      <div className="mb-12 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold font-serif mb-2">Your Dashboard</h1>
          <p className="text-gray-400">Manage your subjects and start taking notes.</p>
        </div>
        <form action={createSubject} className="flex gap-2">
          <input 
            type="text" 
            name="name" 
            placeholder="New Subject Name..." 
            required
            className="bg-[#14120f] border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-accent text-sm"
          />
          <button type="submit" className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create
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
                <button type="submit" className="text-gray-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-4 h-4" />
                </button>
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
                      <button type="submit" className="text-gray-600 hover:text-red-400 p-1 opacity-0 group-hover/note:opacity-100 transition-opacity">
                        <Trash2 className="w-3 h-3" />
                      </button>
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
                placeholder="New note title..." 
                required
                className="bg-[#1a1815] border border-white/5 rounded-md px-3 py-1.5 flex-1 text-sm focus:outline-none focus:border-accent/50 text-white placeholder-gray-600"
              />
              <button type="submit" className="text-accent hover:text-accent-muted p-1.5 bg-accent/10 rounded-md transition-colors">
                <Plus className="w-4 h-4" />
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
    </div>
  );
}
