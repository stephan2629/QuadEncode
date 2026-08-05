import { Loader2 } from 'lucide-react';

export default function SettingsLoading() {
  return (
    <div className="min-h-dvh w-full bg-[#0a0908] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-accent animate-spin" aria-hidden="true" />
    </div>
  );
}
