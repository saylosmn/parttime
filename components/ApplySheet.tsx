'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Lock, X } from 'lucide-react';
import { Avatar } from './ui';
import { requestPushPromptLater } from './Pwa';
import { formatPay, type PayUnit } from '@/lib/config';
import { api } from '@/lib/client';

type Props = {
  job: { id: string; title: string; employer: string; schedule: string; payAmount: number; payUnit: PayUnit };
  me: { name: string; school: string; course: number | null; phone: string };
};

export function ApplySheet({ job, me }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  async function submit() {
    setBusy(true);
    setErr('');
    const r = await api('/api/applications', 'POST', { jobId: job.id, message: message || undefined });
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    requestPushPromptLater();
    setDone(true);
  }

  function close() {
    if (busy) return;
    setOpen(false);
    // Амжилттай илгээсний дараа хаахад хуудсыг шинэчилнэ
    if (done) router.refresh();
  }

  return (
    <>
      <button className="btn-primary w-full" onClick={() => setOpen(true)}>
        Өргөдөл илгээх <ArrowRight size={18} />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={close}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Өргөдөл илгээх"
            className="safe-bottom max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[24px] border border-line bg-surface p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
            {done ? (
              <div className="space-y-4 py-4 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-ink">
                  <Check size={28} />
                </span>
                <p className="h-display text-xl">Өргөдөл илгээгдлээ</p>
                <p className="text-sm text-muted">{job.employer} таны өргөдлийг харахад мэдэгдэл очно.</p>
                <Link href="/me/applications" className="btn-primary w-full">
                  Миний өргөдлүүд
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="h-display text-lg">Өргөдөл илгээх</h2>
                  <button className="icon-btn" onClick={close} aria-label="Хаах">
                    <X size={18} />
                  </button>
                </div>
                <div className="flex items-center gap-3 rounded-card border border-line bg-sunken p-4">
                  <Avatar name={job.employer} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{job.title}</p>
                    <p className="truncate text-xs text-muted">
                      {job.employer} · {job.schedule}
                    </p>
                  </div>
                  <p className="font-display text-sm font-bold text-accent">{formatPay(job.payAmount, job.payUnit).split('/')[0]}</p>
                </div>

                <div>
                  <p className="label">Илгээх мэдээлэл</p>
                  <div className="divide-y divide-line rounded-card border border-line bg-sunken text-sm">
                    <Row k="Нэр" v={me.name} />
                    <Row k="Сургууль" v={`${me.school}${me.course ? ` · ${me.course}-р курс` : ''}`} />
                    <Row
                      k="Утас"
                      v={
                        <span className="inline-flex items-center gap-1.5">
                          <Lock size={13} className="text-muted" /> {me.phone.replace(/\D/g, '').slice(-8, -4)} ••••
                        </span>
                      }
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-muted">Утасны дугаар таныг урьсны дараа л ажил олгогчид харагдана.</p>
                  <Link href="/me/profile" className="mt-1 inline-block text-sm font-semibold text-accent">
                    Профайлаа засах
                  </Link>
                </div>

                <label className="block">
                  <span className="label">Товч танилцуулга (заавал биш)</span>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={500}
                    rows={3}
                    className="input py-3"
                    placeholder="Жишээ нь: Кофе шопод 3 сар ажиллаж байсан. Бямба, ням бүтэн өдөр боломжтой."
                  />
                </label>

                <label className="flex min-h-[44px] cursor-pointer items-start gap-3 text-sm text-soft">
                  <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="mt-0.5 h-5 w-5 accent-[var(--accent)]" />
                  {job.schedule} хуваарийн дагуу ажиллах боломжтой гэдгээ баталж байна
                </label>

                {err && <p className="text-sm text-danger">{err}</p>}
                <button className="btn-primary w-full" disabled={!confirm || busy} onClick={submit}>
                  {busy ? 'Илгээж байна…' : 'Илгээх'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex min-h-[48px] items-center justify-between gap-3 px-4">
      <span className="text-muted">{k}</span>
      <span className="text-right font-semibold">{v}</span>
    </div>
  );
}
