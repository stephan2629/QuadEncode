import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Image as ImageIcon, ClipboardType } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';

interface ImportRow {
  id: string;
  kind: string;
  raw_ref: string | null;
  status: string;
  created_at: string;
  subjects: { name: string } | null;
}

const KIND_ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  image: ImageIcon,
  text: ClipboardType,
};

export default async function ImportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: imports } = await supabase
    .from('imports')
    .select('id, kind, raw_ref, status, created_at, subjects(name)')
    .order('created_at', { ascending: false })
    .returns<ImportRow[]>();

  // Progressive disclosure (section 3): this page exists only once an
  // import has happened. Direct navigation before that goes home.
  if (!imports || imports.length === 0) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-[#0a0908] text-white p-4 sm:p-6 md:p-12 max-w-3xl mx-auto">
      <header className="flex items-center gap-4 mb-10">
        <Link href="/dashboard" className="text-gray-500 hover:text-white transition-colors p-1">
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          <span className="sr-only">Back to dashboard</span>
        </Link>
        <h1 className="text-3xl font-bold font-serif">Imports</h1>
      </header>

      <ul className="space-y-3">
        {imports.map((row) => {
          const Icon = KIND_ICONS[row.kind] ?? FileText;
          return (
            <li
              key={row.id}
              className="flex items-center gap-4 bg-[#14120f] border border-white/10 rounded-2xl px-5 py-4"
            >
              <Icon className="w-5 h-5 text-accent flex-none" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-200 truncate">{row.raw_ref || row.kind}</p>
                <p className="text-xs text-gray-500">
                  {row.subjects?.name ?? 'Subject'} · {row.kind} ·{' '}
                  {new Date(row.created_at).toLocaleDateString()}
                </p>
              </div>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-none ${
                  row.status === 'completed'
                    ? 'bg-green-500/10 text-green-400'
                    : 'bg-white/5 text-gray-400'
                }`}
              >
                {row.status}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
