'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import { StudentFields, EmployerFields, type StudentValues, type EmployerValues } from './fields';

type Props =
  | { role: 'student'; initial: StudentValues; onDone?: () => void }
  | { role: 'employer'; initial: EmployerValues; onDone?: () => void };

export function ProfileForm(props: Props) {
  const router = useRouter();
  const [v, setV] = useState(props.initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await api('/api/profile', 'PATCH', v);
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: 'Хадгалагдлаа' } : { ok: false, text: r.error });
    if (r.ok) {
      router.refresh();
      props.onDone?.();
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {props.role === 'student' ? (
        <StudentFields v={v as StudentValues} set={(p) => setV((s) => ({ ...s, ...p }))} />
      ) : (
        <EmployerFields v={v as EmployerValues} set={(p) => setV((s) => ({ ...s, ...p }))} />
      )}
      {msg && <p className={msg.ok ? 'text-sm text-accent' : 'text-sm text-danger'}>{msg.text}</p>}
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? 'Хадгалж байна…' : 'Хадгалах'}
      </button>
    </form>
  );
}
