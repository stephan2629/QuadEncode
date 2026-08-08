'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setActiveSubject } from '@/app/dashboard/actions';
import { Book } from 'lucide-react';

interface SubjectSwitcherProps {
  subjects: { id: string; name: string }[];
  activeSubjectId: string;
}

export function SubjectSwitcher({ subjects, activeSubjectId }: SubjectSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (subjects.length < 2) {
    // Progressive disclosure: No switcher until second subject exists
    return (
      <div className="flex items-center gap-2 text-gray-400">
        <Book className="w-4 h-4" />
        <span className="text-sm font-medium">{subjects[0]?.name || 'No Subjects'}</span>
      </div>
    );
  }

  // Calling the action directly and following it with an explicit
  // router.refresh(), rather than a plain <form action={setActiveSubject}>
  // and relying on Next's implicit post-action refresh - that implicit
  // refresh isn't reliable here since the whole dashboard tree (PathTracker
  // included) is keyed off a cookie this same action just changed, so a
  // client Router Cache entry from before the switch can stick around and
  // show the previous subject's path until something forces a real refetch.
  const handleChange = (id: string) => {
    const formData = new FormData();
    formData.set('subject_id', id);
    startTransition(async () => {
      await setActiveSubject(formData);
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Book className="w-4 h-4 text-gray-500" />
      <select
        name="subject_id"
        defaultValue={activeSubjectId}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isPending}
        // min-h-44 and real padding: p-0 left this at 19px tall, well under
        // the 44px touch target, and it is the control for switching subjects
        // on a phone. focus-visible rather than the outline-none it had, so
        // keyboard users can see where they are.
        className="bg-transparent border-none text-gray-300 font-medium text-sm cursor-pointer hover:text-white transition-colors min-h-[44px] py-2 pr-2 disabled:opacity-60 rounded-lg focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 [&>option]:bg-[#14120f] [&>option]:text-white"
        aria-label="Switch Subject"
      >
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}
