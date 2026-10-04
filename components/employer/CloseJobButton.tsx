'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/client';
import { toast } from '@/components/Toast';

export function CloseJobButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn-danger"
      disabled={busy}
      onClick={async () => {
        if (!confirm('Зарыг хаах уу? Шинэ өргөдөл ирэхээ болино.')) return;
        setBusy(true);
        const r = await api(`/api/jobs/${id}`, 'DELETE');
        toast(r.ok ? 'Зар хаагдлаа' : r.error, r.ok ? 'ok' : 'err');
        router.refresh();
        setBusy(false);
      }}
    >
      Хаах
    </button>
  );
}
