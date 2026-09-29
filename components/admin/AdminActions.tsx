'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';

function useAct() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function run(url: string, body: object) {
    setBusy(true);
    setErr('');
    const r = await api(url, 'PATCH', body);
    setBusy(false);
    if (!r.ok) setErr(r.error);
    else router.refresh();
  }
  return { busy, err, run };
}

export function PendingJobActions({ id }: { id: string }) {
  const { busy, err, run } = useAct();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const url = `/api/admin/jobs/${id}`;
  return (
    <div className="space-y-2">
      {rejecting ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input className="input" autoFocus placeholder="Татгалзах шалтгаан" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
          <button className="btn-danger" disabled={busy || reason.trim().length < 3} onClick={() => run(url, { action: 'reject', reason })}>
            Татгалзах
          </button>
          <button className="btn-ghost" onClick={() => setRejecting(false)}>
            Болих
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button className="btn-primary" disabled={busy} onClick={() => run(url, { action: 'approve' })}>
            Зөвшөөрөх
          </button>
          <button className="btn-ghost" disabled={busy} onClick={() => setRejecting(true)}>
            Татгалзах
          </button>
        </div>
      )}
      {err && <p className="text-sm text-danger">{err}</p>}
    </div>
  );
}

export function JobAdminActions({ id, featured, status }: { id: string; featured: boolean; status: string }) {
  const { busy, err, run } = useAct();
  const [days, setDays] = useState(7);
  const url = `/api/admin/jobs/${id}`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'active' &&
        (featured ? (
          <button className="btn-ghost" disabled={busy} onClick={() => run(url, { action: 'unfeature' })}>
            Онцлохыг болиулах
          </button>
        ) : (
          <>
            <select className="input w-24 min-h-[44px]" value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Хоног">
              {[3, 7, 14, 30].map((d) => (
                <option key={d} value={d}>
                  {d} хоног
                </option>
              ))}
            </select>
            <button className="btn-primary" disabled={busy} onClick={() => run(url, { action: 'feature', days })}>
              Онцлох болгох
            </button>
          </>
        ))}
      {status === 'pending' && <PendingJobActions id={id} />}
      {status !== 'closed' && status !== 'pending' && (
        <button className="btn-danger" disabled={busy} onClick={() => confirm('Зарыг хаах уу?') && run(url, { action: 'close' })}>
          Хаах
        </button>
      )}
      {err && <p className="w-full text-sm text-danger">{err}</p>}
    </div>
  );
}

export function UserAdminActions({ id, verified, banned, role }: { id: string; verified: boolean; banned: boolean; role: string }) {
  const { busy, err, run } = useAct();
  const url = `/api/admin/users/${id}`;
  return (
    <div className="flex flex-wrap gap-2">
      {role === 'employer' && (
        <button className={verified ? 'btn-ghost' : 'btn-primary'} disabled={busy} onClick={() => run(url, { verified: !verified })}>
          {verified ? 'Баталгаажуулалт цуцлах' : 'Баталгаажуулах'}
        </button>
      )}
      {role !== 'admin' && (
        <button className={banned ? 'btn-ghost' : 'btn-danger'} disabled={busy} onClick={() => (banned || confirm('Хэрэглэгчийг хаах уу?')) && run(url, { banned: !banned })}>
          {banned ? 'Нээх' : 'Хаах'}
        </button>
      )}
      {err && <p className="w-full text-sm text-danger">{err}</p>}
    </div>
  );
}

export function PaymentActions({ id }: { id: string }) {
  const { busy, err, run } = useAct();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const url = `/api/admin/payments/${id}`;
  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto">
      {rejecting ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input className="input" autoFocus placeholder="Шалтгаан (жишээ: мөнгө ороогүй)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
          <button className="btn-danger" disabled={busy || note.trim().length < 3} onClick={() => run(url, { action: 'reject', note })}>
            Татгалзах
          </button>
          <button className="btn-ghost" onClick={() => setRejecting(false)}>
            Болих
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button className="btn-primary" disabled={busy} onClick={() => confirm('Дансанд мөнгө орсныг шалгасан уу? Зар онцлох болно.') && run(url, { action: 'confirm' })}>
            Баталгаажуулах
          </button>
          <button className="btn-ghost" disabled={busy} onClick={() => setRejecting(true)}>
            Татгалзах
          </button>
        </div>
      )}
      {err && <p className="text-sm text-danger">{err}</p>}
    </div>
  );
}

export function ResolveReport({ id }: { id: string }) {
  const { busy, run } = useAct();
  return (
    <button className="btn-ghost" disabled={busy} onClick={() => run(`/api/admin/reports/${id}`, {})}>
      Шийдвэрлэсэн
    </button>
  );
}
