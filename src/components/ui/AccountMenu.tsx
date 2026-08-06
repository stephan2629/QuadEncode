'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { m, AnimatePresence } from 'framer-motion';
import { User, LogOut, ChevronDown } from 'lucide-react';

interface AccountMenuProps {
  email: string;
  name?: string | null;
  onLogout: () => void;
}

// Structure and the "signed in as" header borrow from a UIverse.io dropdown
// by DipeshPun91; the left accent-bar row hover borrows from a UIverse.io
// button list by HetPatel69. Recolored from both sources' blue/GitHub-gray
// to this app's actual palette (warm near-black, one amber accent per
// CLAUDE.md section 12) and merged into one adaptive component rather than
// keeping two divergent desktop/mobile skins for what's just two menu
// items (Account, Log out) - Profile/Appearance/Accessibility/Notifications
// from the reference snippets were dropped, nothing in this app backs them.
export default function AccountMenu({ email, name, onLogout }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const displayName = name || email;

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${displayName}`}
        className="flex items-center gap-2 pl-2 pr-3 py-2 min-h-[44px] rounded-lg text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors max-w-[240px] sm:max-w-none"
      >
        <span className="w-6 h-6 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0">
          <User className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
        </span>
        <span className="hidden sm:inline text-xs md:text-sm truncate">{displayName}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      <AnimatePresence>
        {open && (
          <m.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            role="menu"
            className="absolute right-0 mt-2 w-52 sm:w-64 bg-[#14120f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-30"
          >
            <div className="px-4 py-3 border-b border-white/5 bg-white/[0.03]">
              <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Signed in as</p>
              <p className="text-sm text-white truncate mt-0.5">{displayName}</p>
            </div>

            <div className="py-1.5">
              <Link
                href="/settings"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="group relative flex items-center gap-3 px-4 py-3 min-h-[44px] text-sm text-gray-300 hover:bg-accent/10 hover:text-white transition-colors"
              >
                <span className="absolute left-0 top-0 h-full w-1 bg-accent scale-y-0 group-hover:scale-y-100 transition-transform" aria-hidden="true" />
                <User className="w-4 h-4 text-gray-500 group-hover:text-accent transition-colors" aria-hidden="true" />
                Account
              </Link>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
                className="group relative flex items-center gap-3 w-full px-4 py-3 min-h-[44px] text-sm text-gray-300 hover:bg-red-500/10 hover:text-red-400 transition-colors cursor-pointer"
              >
                <span className="absolute left-0 top-0 h-full w-1 bg-red-500 scale-y-0 group-hover:scale-y-100 transition-transform" aria-hidden="true" />
                <LogOut className="w-4 h-4 text-gray-500 group-hover:text-red-400 transition-colors" aria-hidden="true" />
                Log out
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
