'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/client';

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
        await api(`/api/jobs/${id}`, 'DELETE');
        router.refresh();
        setBusy(false);
      }}
    >
      Хаах
    </button>
  );
}
