'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { deleteSubjectById } from './actions';

export default function DeleteSubjectButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteSubjectById(id);
      if (result?.error) toast.error(result.error);
      else toast.success(`"${name}" deleted`);
    });
  };

  return (
    <ConfirmButton
      confirmTitle="Delete subject?"
      confirmMessage={`Delete "${name}" and all its notes? This can't be undone.`}
      aria-label={`Delete ${name}`}
      disabled={isPending}
      onClick={handleDelete}
      className="text-gray-500 hover:text-red-400 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-400 rounded disabled:opacity-50"
    >
      <Trash2 className="w-5 h-5" aria-hidden="true" />
    </ConfirmButton>
  );
}
