import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, KeyRound, LogOut, Trash2, ChevronDown } from 'lucide-react';
import { logout, deleteAccount } from '../login/actions';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import ChangePasswordForm from './ChangePasswordForm';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="min-h-dvh w-full bg-[#0a0908] text-white">
      <div className="w-full p-4 sm:p-6 md:p-12 max-w-3xl mx-auto">
        <header className="flex items-center gap-3 mb-10">
          <Link href="/dashboard" className="flex items-center justify-center min-w-[44px] min-h-[44px] -ml-2.5 text-gray-400 hover:text-white transition-colors rounded-lg" aria-label="Back to dashboard">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Image src="/logo.png" alt="Quad Encode Logo" width={28} height={28} className="w-7 h-7" />
          <h1 className="font-serif text-xl font-bold">Account</h1>
        </header>

        <div className="bg-[#14120f] border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-6 md:p-10 space-y-4">
            {memberSince && (
              <span className="inline-block text-xs font-mono uppercase tracking-wider text-accent bg-accent/10 border border-accent/20 rounded-full px-3 py-1">
                Studying since {memberSince}
              </span>
            )}
            <p className="text-lg text-gray-200">{user.user_metadata?.name || user.user_metadata?.full_name || user.email}</p>
          </div>

          <div className="border-t border-white/5 divide-y divide-white/5">
            <details className="group">
              <summary className="list-none flex items-center gap-4 px-6 md:px-10 py-5 cursor-pointer hover:bg-white/[0.03] transition-colors">
                <KeyRound className="w-4 h-4 text-gray-400 shrink-0" aria-hidden="true" />
                <span className="flex-1 text-sm font-medium text-gray-200">Change password</span>
                <ChevronDown className="w-4 h-4 text-gray-500 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="px-6 md:px-10 pb-6">
                <ChangePasswordForm />
              </div>
            </details>

            <form action={logout}>
              <button
                type="submit"
                className="w-full flex items-center gap-4 px-6 md:px-10 py-5 min-h-[44px] text-left hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-gray-400 shrink-0" aria-hidden="true" />
                <span className="flex-1 text-sm font-medium text-gray-200">Log out</span>
              </button>
            </form>

            <form action={deleteAccount}>
              <ConfirmButton
                confirmTitle="Delete account?"
                confirmMessage="All subjects, notes, cards, and review history are permanently removed. This can't be undone."
                confirmLabel="Delete account"
                className="w-full flex items-center gap-4 px-6 md:px-10 py-5 min-h-[44px] text-left text-red-400 hover:bg-red-500/[0.06] transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="flex-1 text-sm font-medium">Delete account</span>
              </ConfirmButton>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
