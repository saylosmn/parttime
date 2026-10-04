'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { CalendarDays, ChevronDown, MessageCircle, Phone, UserRound, X } from 'lucide-react';
import { StudentProfileDialog } from './StudentProfileDialog';
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
  const [profile, setProfile] = useState(false);

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
          {a.match.length > 0 && (
            <p className="mt-1 flex flex-wrap gap-1">
              {a.match.map((m) => (
                <span key={m} className="badge border border-green-line bg-green-bg py-0.5 text-[11px] text-green-soft">
                  ✓ {m}
                </span>
              ))}
            </p>
          )}
        </button>
        <span className="hidden w-40 truncate text-sm text-soft xl:block">{s.availability}</span>
        <span className="w-16">
          <Rating avg={s.ratingAvg} count={s.ratingCount} showCount={false} />
        </span>
        <div className="flex w-full items-center justify-end gap-2 md:w-auto">
          <button className="btn-ghost px-3" onClick={() => setProfile(true)} aria-label={`${s.name}-ийн профайл`}>
            <UserRound size={16} />
          </button>
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
            {['invited', 'hired', 'completed'].includes(a.status) && (
              <Link href={`/chat/${a.id}`} className="btn-ghost">
                <MessageCircle size={16} /> Чат
              </Link>
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
      {profile && <StudentProfileDialog applicationId={a.id} onClose={() => setProfile(false)} />}
      {inviting && canInvite && <InviteDialog name={s.name} busy={busy} onClose={() => setInviting(false)} onSubmit={(d) => act({ action: 'invite', interviewAt: d.toISOString() })} />}
    </div>
  );
}

const SLOTS = ['10:00', '11:00', '14:00', '15:00', '17:00'];
const WD = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'];
const LAST_TIME_KEY = 'tsag:lastInterviewTime';

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Ярилцлагын урилга: ойрын 7 хоногийг товчоор, түүнээс хойших (60 хоног хүртэл) өдрийг календараас.
 * Сүүлд ашигласан цагийг санаж, дараагийн урилгад автоматаар сонгоно.
 */
function InviteDialog({ name, busy, onClose, onSubmit }: { name: string; busy: boolean; onClose: () => void; onSubmit: (d: Date) => void }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i + 1);
    return d;
  });
  // Цонх нээгдсэн мөч (render бүрт Date.now() дуудахгүй)
  const [openedAt] = useState(() => Date.now());
  const [date, setDate] = useState(ymd(days[0]));
  const [time, setTime] = useState(() => {
    try {
      return localStorage.getItem(LAST_TIME_KEY) || '14:00';
    } catch {
      return '14:00';
    }
  });
  const min = ymd(new Date());
  const maxD = new Date();
  maxD.setDate(maxD.getDate() + 60);

  const [y, mo, da] = date.split('-').map(Number);
  const [h, m] = time.split(':').map(Number);
  const at = new Date(y, mo - 1, da, h, m);
  const valid = !Number.isNaN(at.getTime()) && at.getTime() > openedAt;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div className="safe-bottom max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[24px] border border-line bg-surface p-5 sm:rounded-[24px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="h-display text-lg">Ярилцлагад урих</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Хаах">
            <X size={18} />
          </button>
        </div>
        <p className="mt-1 text-sm text-muted">{name}</p>

        <p className="label mt-5">Өдөр</p>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d) => {
            const v = ymd(d);
            return (
              <button key={v} onClick={() => setDate(v)} className={clsx('flex min-h-[56px] flex-col items-center justify-center rounded-btn border text-xs', date === v ? 'border-accent bg-accent font-bold text-accent-ink' : 'border-line bg-sunken text-soft')}>
                <span>{WD[d.getDay()]}</span>
                <span className="text-base font-bold">{d.getDate()}</span>
              </button>
            );
          })}
        </div>
        <label className="mt-2 flex items-center gap-2 text-sm text-muted">
          Өөр өдөр:
          <input type="date" className="input min-h-[44px] flex-1" min={min} max={ymd(maxD)} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </label>

        <p className="label mt-5">Цаг</p>
        <div className="flex flex-wrap gap-2">
          {SLOTS.map((t) => (
            <button key={t} onClick={() => setTime(t)} className={clsx('chip', time === t && 'chip-active')}>
              {t}
            </button>
          ))}
          <input type="time" value={time} onChange={(e) => e.target.value && setTime(e.target.value)} className="input min-h-[36px] w-32 rounded-full" aria-label="Өөр цаг" />
        </div>

        {!valid && <p className="mt-3 text-sm text-danger">Ирээдүйн өдөр, цаг сонгоно уу.</p>}
        <button
          className="btn-primary mt-6 w-full"
          disabled={busy || !valid}
          onClick={() => {
            try {
              localStorage.setItem(LAST_TIME_KEY, time);
            } catch {}
            onSubmit(at);
          }}
        >
          Урилга илгээх · {WD[at.getDay()] ?? ''} {at.getMonth() + 1}/{at.getDate()}, {time}
        </button>
      </div>
    </div>
  );
}
