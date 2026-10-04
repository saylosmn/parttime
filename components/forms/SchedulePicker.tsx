'use client';

import { useState } from 'react';
import clsx from 'clsx';

const DAYS = ['Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя', 'Ня'] as const;
const TIME_RE = /(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/;

/** "Да–Ба" мэт дараалсан гарагуудыг товчилно. */
function formatDays(sel: number[]) {
  const s = [...sel].sort((a, b) => a - b);
  if (s.length === 7) return 'Өдөр бүр';
  const runs: number[][] = [];
  for (const d of s) {
    const last = runs[runs.length - 1];
    if (last && d === last[last.length - 1] + 1) last.push(d);
    else runs.push([d]);
  }
  return runs.map((r) => (r.length >= 3 ? `${DAYS[r[0]]}–${DAYS[r[r.length - 1]]}` : r.map((i) => DAYS[i]).join(', '))).join(', ');
}

/** Өмнө хадгалсан хуваарийг задлах (бүтэцтэй бол товчоор, үгүй бол чөлөөт текстээр). */
function parse(schedule: string) {
  const t = schedule.match(TIME_RE);
  const daysPart = (t ? schedule.replace(t[0], '') : schedule).replace(/[,\s]+$/, '').trim();
  if (!t) return null;
  const sel = new Set<number>();
  if (daysPart === 'Өдөр бүр') DAYS.forEach((_, i) => sel.add(i));
  else
    for (const tok of daysPart.split(/,\s*/)) {
      const range = tok.split('–');
      if (range.length === 2) {
        const a = DAYS.indexOf(range[0] as (typeof DAYS)[number]);
        const b = DAYS.indexOf(range[1] as (typeof DAYS)[number]);
        if (a < 0 || b < 0) return null;
        for (let i = a; i <= b; i++) sel.add(i);
      } else {
        const i = DAYS.indexOf(tok as (typeof DAYS)[number]);
        if (i < 0) return null;
        sel.add(i);
      }
    }
  return { days: [...sel], start: t[1].padStart(5, '0'), end: t[2].padStart(5, '0') };
}

/**
 * Хуваарь сонгогч: гараг + эхлэх/дуусах цаг → "Бя, Ня 09:00–15:00".
 * onTags-аар амралтын өдөр / орой шошгыг санал болгоно.
 */
export function SchedulePicker({
  value,
  onChange,
  onTags,
}: {
  value: string;
  onChange: (v: string) => void;
  onTags: (t: { weekend: boolean; evening: boolean }) => void;
}) {
  const parsed = value ? parse(value) : { days: [] as number[], start: '09:00', end: '18:00' };
  const [free, setFree] = useState(Boolean(value) && !parsed);
  const [days, setDays] = useState<number[]>(parsed?.days ?? []);
  const [start, setStart] = useState(parsed?.start ?? '09:00');
  const [end, setEnd] = useState(parsed?.end ?? '18:00');

  function emit(d: number[], s: string, e: string) {
    if (!d.length) return onChange('');
    onChange(`${formatDays(d)} ${s}–${e}`);
    onTags({ weekend: d.includes(5) || d.includes(6), evening: s >= '17:00' });
  }

  if (free) {
    return (
      <div className="space-y-1.5">
        <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Жишээ нь: 7 хоногт 10 цаг, уян хатан" required maxLength={80} />
        <button type="button" className="text-sm font-semibold text-accent" onClick={() => setFree(false)}>
          Гараг, цагаар сонгох
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-1.5">
        {DAYS.map((d, i) => {
          const on = days.includes(i);
          return (
            <button
              type="button"
              key={d}
              aria-pressed={on}
              className={clsx('flex min-h-[44px] items-center justify-center rounded-btn border text-sm font-semibold', on ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-sunken text-soft')}
              onClick={() => {
                const next = on ? days.filter((x) => x !== i) : [...days, i];
                setDays(next);
                emit(next, start, end);
              }}
            >
              {d}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <input type="time" className="input" value={start} aria-label="Эхлэх цаг" onChange={(e) => { setStart(e.target.value); emit(days, e.target.value, end); }} />
        <span className="text-muted">–</span>
        <input type="time" className="input" value={end} aria-label="Дуусах цаг" onChange={(e) => { setEnd(e.target.value); emit(days, start, e.target.value); }} />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">{value ? `Харагдах нь: ${value}` : 'Ажиллах гарагаа сонгоно уу'}</span>
        <button type="button" className="font-semibold text-accent" onClick={() => setFree(true)}>
          Өөрөөр бичих
        </button>
      </div>
      {/* HTML-ийн required шалгалтад зориулсан нуугдмал талбар */}
      <input tabIndex={-1} aria-hidden className="sr-only" value={value} onChange={() => {}} required />
    </div>
  );
}
