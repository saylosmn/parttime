'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import { toast } from '@/components/Toast';

/** Мэдэгдлийн хуудас нээгдэхэд хонхны тоог шинэчлэх дохио. */
export function SeenSignal() {
  useEffect(() => {
    window.dispatchEvent(new Event('notifications:changed'));
  }, []);
  return null;
}

export function MarkAllRead() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn-ghost px-3 text-xs"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await api('/api/notifications', 'PATCH', { all: true });
        window.dispatchEvent(new Event('notifications:changed'));
        router.refresh();
        setBusy(false);
      }}
    >
      Бүгдийг уншсан
    </button>
  );
}

export function InviteActions({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<'idle' | 'reschedule'>('idle');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function send(body: object) {
    setBusy(true);
    setErr('');
    const r = await api<Record<string, unknown>>(`/api/applications/${applicationId}`, 'PATCH', body);
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    toast((body as { action: string }).action === 'accept_invite' ? 'Урилгыг зөвшөөрлөө — ажил олгогчид мэдэгдэл очлоо' : 'Цаг солих хүсэлт илгээгдлээ');
    router.refresh();
  }

  return (
    <div className="mt-3">
      {mode === 'idle' ? (
        <div className="flex gap-2">
          <button className="btn-primary" disabled={busy} onClick={() => send({ action: 'accept_invite' })}>
            Зөвшөөрөх
          </button>
          <button className="btn-ghost" disabled={busy} onClick={() => setMode('reschedule')}>
            Цаг солих
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <input className="input" autoFocus placeholder="Жишээ нь: Лхагва 15:00-аас хойш боломжтой" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
          <div className="flex gap-2">
            <button className="btn-primary" disabled={busy || note.trim().length < 2} onClick={() => send({ action: 'reschedule', note })}>
              Илгээх
            </button>
            <button className="btn-ghost" onClick={() => setMode('idle')}>
              Болих
            </button>
          </div>
        </div>
      )}
      {err && <p className="mt-2 text-sm text-danger">{err}</p>}
    </div>
  );
}
