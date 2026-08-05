'use client';

import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Book, LayoutDashboard, LogOut, Search } from 'lucide-react';
import { logout } from '@/app/login/actions';

export function GlobalCommandPalette() {
  const [open, setOpen] = useState(false);
  const [subjects, setSubjects] = useState<{ id: string, name: string, slug: string }[]>([]);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Don't trigger if user is selecting text (likely trying to create a cloze card in the editor)
      const selection = window.getSelection()?.toString();
      
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        if (!selection) {
          e.preventDefault();
          setOpen((open) => !open);
        }
      }
      
      // Also support Cmd+J just in case
      if (e.key === 'j' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (open && subjects.length === 0) {
      const fetchSubjects = async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('subjects')
            .select('id, name, slug');
          if (data) setSubjects(data);
        }
      };
      fetchSubjects();
    }
  }, [open, subjects.length]);

  return (
    <Command.Dialog 
      open={open} 
      onOpenChange={setOpen}
      label="Global command menu"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] sm:pt-[20vh] bg-black/50 backdrop-blur-sm"
    >
      <div className="w-full max-w-2xl bg-[#14120F]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center border-b border-white/10 px-4">
          <Search className="w-5 h-5 text-gray-400 mr-2" />
          <Command.Input 
            placeholder="Type a command or search..." 
            className="w-full bg-transparent border-none py-4 text-white placeholder-gray-500 focus:outline-none focus:ring-0 text-lg"
          />
        </div>
        
        <Command.List className="max-h-[300px] overflow-y-auto p-2 custom-scrollbar">
          <Command.Empty className="py-6 text-center text-sm text-gray-400 font-serif italic">No results found.</Command.Empty>

          <Command.Group heading="Navigation" className="text-xs font-semibold text-gray-400 uppercase tracking-wider p-2">
            <Command.Item 
              onSelect={() => { setOpen(false); router.push('/dashboard'); }}
              className="flex items-center px-4 py-3 mt-1 rounded-lg text-sm text-gray-200 cursor-pointer aria-selected:bg-white/10 aria-selected:text-white"
            >
              <LayoutDashboard className="w-4 h-4 mr-3 text-accent" />
              Go to dashboard
            </Command.Item>
            <Command.Item 
              onSelect={() => { setOpen(false); router.push('/review'); }}
              className="flex items-center px-4 py-3 mt-1 rounded-lg text-sm text-gray-200 cursor-pointer aria-selected:bg-white/10 aria-selected:text-white"
            >
              <Book className="w-4 h-4 mr-3 text-green-400" />
              Start review session
            </Command.Item>
          </Command.Group>

          {subjects.length > 0 && (
            <Command.Group heading="Subjects" className="text-xs font-semibold text-gray-400 uppercase tracking-wider p-2 mt-2">
              {subjects.map((s) => (
                <Command.Item 
                  key={s.id}
                  onSelect={() => { 
                    setOpen(false); 
                    document.cookie = `active_subject_id=${s.id}; path=/; max-age=31536000`;
                    router.push('/dashboard'); 
                    router.refresh();
                  }}
                  className="flex items-center px-4 py-3 mt-1 rounded-lg text-sm text-gray-200 cursor-pointer aria-selected:bg-white/10 aria-selected:text-white"
                >
                  <Book className="w-4 h-4 mr-3 text-gray-400" />
                  Switch to {s.name}
                </Command.Item>
              ))}
            </Command.Group>
          )}

          <Command.Group heading="Account" className="text-xs font-semibold text-gray-400 uppercase tracking-wider p-2 mt-2">
            <Command.Item 
              onSelect={() => { 
                setOpen(false); 
                logout();
              }}
              className="flex items-center px-4 py-3 mt-1 rounded-lg text-sm text-red-400 cursor-pointer aria-selected:bg-red-500/10 aria-selected:text-red-300"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Sign out
            </Command.Item>
          </Command.Group>
        </Command.List>
      </div>
    </Command.Dialog>
  );
}
