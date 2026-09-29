'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { CalendarDays, ChevronDown, Phone, X } from 'lucide-react';
import { Avatar, Rating, StatusBadge } from '@/components/ui';
import { ReviewForm } from '@/components/ReviewForm';
import { api } from '@/lib/client';
import { formatDateTime } from '@/lib/config';
import type { ApplicantView } from '@/lib/employer';

export function ApplicantList({ items, showJob = false, compact = false }: { items: ApplicantView[]; showJob?: boolean; compact?: boolean }) {
  return (
    <div className="space-y-2.5">
      {items.map((a) => (
        <ApplicantRow key={a.id} a={a} showJob={showJob} compact={compact} />
      ))}
    </div>
  );
}

function ApplicantRow({ a, showJob, compact }: { a: ApplicantView; showJob: boolean; compact: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(false);
  const [inviting, setInviting] = useState(false);

  async function act(body: object) {
    setBusy(true);
    setErr('');
    const r = await api(`/api/applications/${a.id}`, 'PATCH', body);
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setInviting(false);
    router.refresh();
  }

  const s = a.student;
  const canInvite = ['sent', 'viewed', 'invited'].includes(a.status);

  return (
    <div className="rounded-card border border-line bg-sunken">
      <div className="flex flex-wrap items-center gap-3 p-3.5 md:flex-nowrap">
        <Avatar name={s.name} size="sm" />
        <button className="min-w-0 flex-1 text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <p className="flex items-center gap-1.5 truncate font-bold">
            {s.name}
            {!compact && <ChevronDown size={16} className={clsx('text-muted transition-transform', open && 'rotate-180')} />}
          </p>
          <p className="truncate text-xs text-muted">
            {[s.school, s.course && `${s.course}-р курс`].filter(Boolean).join(' · ')}
            {showJob && ` · «${a.job.title}»`}
          </p>
        </button>
        <span className="hidden w-40 truncate text-sm text-soft xl:block">{s.availability}</span>
        <span className="w-16">
          <Rating avg={s.ratingAvg} count={s.ratingCount} showCount={false} />
        </span>
        <div className="flex w-full items-center justify-end gap-2 md:w-auto">
          {a.status === 'sent' || a.status === 'viewed' ? (
            <>
              <button className="btn-primary px-4" disabled={busy} onClick={() => setInviting(true)}>
                Урих
              </button>
              <button className="btn-ghost px-4" disabled={busy} onClick={() => confirm(`${s.name}-ийн өргөдлөөс татгалзах уу?`) && act({ action: 'reject' })}>
                Татгалзах
              </button>
            </>
          ) : (
            <StatusBadge status={a.status} />
          )}
        </div>
      </div>

      {(open || (!compact && ['invited', 'hired', 'completed'].includes(a.status))) && (
        <div className="space-y-3 border-t border-line p-4 text-sm">
          {open && (
            <>
              {a.message && <p className="rounded-btn bg-surface p-3 text-soft">“{a.message}”</p>}
              <p className="text-muted">
                Дүүрэг: <span className="text-soft">{s.district ?? '—'}</span> · Чөлөөт цаг: <span className="text-soft">{s.availability || '—'}</span>
              </p>
              {s.bio && <p className="text-soft">{s.bio}</p>}
            </>
          )}
          {s.phone ? (
            <a href={`tel:+976${s.phone.replace(/\s/g, '')}`} className="inline-flex min-h-[44px] items-center gap-2 font-semibold text-accent">
              <Phone size={16} /> +976 {s.phone}
            </a>
          ) : (
            open && <p className="text-xs text-muted">Утасны дугаар урьсны дараа харагдана.</p>
          )}
          {a.status === 'invited' && a.interviewAt && (
            <p className="flex items-center gap-2 text-soft">
              <CalendarDays size={16} className="text-accent" />
              Ярилцлага: {formatDateTime(a.interviewAt)}
              {a.interviewResponse === 'accepted' && <span className="badge bg-green-bg text-green-soft">Зөвшөөрсөн</span>}
              {a.interviewResponse === 'reschedule' && <span className="badge bg-[#2a1f08] text-urgent">Цаг солих: {a.rescheduleNote}</span>}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {a.status === 'invited' && (
              <>
                <button className="btn-primary" disabled={busy} onClick={() => act({ action: 'hire' })}>
                  Ажилд авсан
                </button>
                <button className="btn-ghost" disabled={busy} onClick={() => setInviting(true)}>
                  Цаг өөрчлөх
                </button>
                <button className="btn-ghost" disabled={busy} onClick={() => confirm('Татгалзах уу?') && act({ action: 'reject' })}>
                  Татгалзах
                </button>
              </>
            )}
            {a.status === 'hired' && (
              <button className="btn-primary" disabled={busy} onClick={() => confirm('Ажил дууссан гэж тэмдэглэх үү? Хоёр талд үнэлгээ өгөх хүсэлт очно.') && act({ action: 'complete' })}>
                Ажил дууссан
              </button>
            )}
          </div>
          {a.status === 'completed' && !a.reviewedByMe && (
            <div>
              <p className="mb-2 font-semibold">Оюутныг үнэлэх</p>
              <ReviewForm applicationId={a.id} direction="employer_to_student" />
            </div>
          )}
          {showJob && (
            <Link href={`/employer/jobs/${a.job.id}`} className="inline-block text-xs font-semibold text-accent">
              Зарын өргөдлүүд →
            </Link>
          )}
        </div>
      )}
      {err && <p className="px-4 pb-3 text-sm text-danger">{err}</p>}
      {inviting && canInvite && <InviteDialog name={s.name} busy={busy} onClose={() => setInviting(false)} onSubmit={(d) => act({ action: 'invite', interviewAt: d.toISOString() })} />}
    </div>
  );
}

const SLOTS = ['10:00', '11:00', '14:00', '15:00', '17:00'];
const WD = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'];

function InviteDialog({ name, busy, onClose, onSubmit }: { name: string; busy: boolean; onClose: () => void; onSubmit: (d: Date) => void }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i + 1);
    return d;
  });
  const [day, setDay] = useState(0);
  const [slot, setSlot] = useState('14:00');
  const [custom, setCustom] = useState('');
  const time = custom || slot;
  const at = new Date(days[day]);
  const [h, m] = time.split(':').map(Number);
  at.setHours(h, m);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div className="safe-bottom w-full max-w-md rounded-t-[24px] border border-line bg-surface p-5 sm:rounded-[24px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="h-display text-lg">Ярилцлагад урих</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Хаах">
            <X size={18} />
          </button>
        </div>
        <p className="mt-1 text-sm text-muted">{name}</p>
        <p className="label mt-5">Өдөр</p>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d, i) => (
            <button key={i} onClick={() => setDay(i)} className={clsx('flex min-h-[56px] flex-col items-center justify-center rounded-btn border text-xs', day === i ? 'border-accent bg-accent font-bold text-accent-ink' : 'border-line bg-sunken text-soft')}>
              <span>{WD[d.getDay()]}</span>
              <span className="text-base font-bold">{d.getDate()}</span>
            </button>
          ))}
        </div>
        <p className="label mt-5">Цаг</p>
        <div className="flex flex-wrap gap-2">
          {SLOTS.map((s) => (
            <button
              key={s}
              onClick={() => {
                setSlot(s);
                setCustom('');
              }}
              className={clsx('chip', !custom && slot === s && 'chip-active')}
            >
              {s}
            </button>
          ))}
          <input type="time" value={custom} onChange={(e) => setCustom(e.target.value)} className="input w-32 min-h-[36px] rounded-full" aria-label="Өөр цаг" />
        </div>
        <button className="btn-primary mt-6 w-full" disabled={busy} onClick={() => onSubmit(at)}>
          Урилга илгээх · {WD[at.getDay()]} {at.getDate()}, {time}
        </button>
      </div>
    </div>
  );
}
