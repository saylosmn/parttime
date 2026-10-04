'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark } from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/client';
import { toast } from '@/components/Toast';

/** Зар хадгалах товч. Нэвтрээгүй бол нэвтрэх хуудас руу. */
export function SaveButton({ jobId, initial, canSave, loggedIn }: { jobId: string; initial: boolean; canSave: boolean; loggedIn: boolean }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  if (loggedIn && !canSave) return null; // Ажил олгогч, админд харагдахгүй

  return (
    <button
      className={clsx('icon-btn', saved && 'border-green-line bg-green-bg text-accent')}
      aria-pressed={saved}
      aria-label={saved ? 'Хадгалснаас хасах' : 'Зар хадгалах'}
      disabled={busy}
      onClick={async () => {
        if (!loggedIn) return router.push(`/login?callbackUrl=/jobs/${jobId}`);
        const next = !saved;
        setSaved(next);
        setBusy(true);
        const r = await api('/api/saved', 'POST', { jobId, saved: next });
        setBusy(false);
        if (!r.ok) {
          setSaved(!next);
          toast(r.error, 'err');
        } else {
          toast(next ? 'Зар хадгалагдлаа — Профайл → Хадгалсан зарууд' : 'Хадгалснаас хаслаа');
          router.refresh();
        }
      }}
    >
      <Bookmark size={20} fill={saved ? 'currentColor' : 'none'} />
    </button>
  );
}
