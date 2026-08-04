'use client';

import { setActiveSubject } from '@/app/dashboard/actions';
import { Book } from 'lucide-react';

interface SubjectSwitcherProps {
  subjects: { id: string; name: string }[];
  activeSubjectId: string;
}

export function SubjectSwitcher({ subjects, activeSubjectId }: SubjectSwitcherProps) {
  if (subjects.length < 2) {
    // Progressive disclosure: No switcher until second subject exists
    return (
      <div className="flex items-center gap-2 text-gray-400">
        <Book className="w-4 h-4" />
        <span className="text-sm font-medium">{subjects[0]?.name || 'No Subjects'}</span>
      </div>
    );
  }

  return (
    <form action={setActiveSubject} className="flex items-center gap-2">
      <Book className="w-4 h-4 text-gray-500" />
      <select
        name="subject_id"
        defaultValue={activeSubjectId}
        onChange={(e) => {
          e.target.form?.requestSubmit();
        }}
        className="bg-transparent border-none text-gray-300 font-medium text-sm focus:outline-none focus:ring-0 cursor-pointer hover:text-white transition-colors p-0 [&>option]:bg-[#14120f] [&>option]:text-white"
        aria-label="Switch Subject"
      >
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </form>
  );
}
