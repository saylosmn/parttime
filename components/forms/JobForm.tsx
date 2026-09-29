'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Plus, X, Zap } from 'lucide-react';
import { api } from '@/lib/client';
import { PAY_UNITS, TAGS, type JobTag, type PayUnit } from '@/lib/config';
import { requestPushPromptLater } from '../Pwa';
import { Field, DistrictSelect } from './fields';

export type JobValues = {
  title: string;
  description: string;
  requirements: string[];
  payAmount: number | '';
  payUnit: PayUnit;
  district: string;
  address: string;
  schedule: string;
  tags: JobTag[];
  isUrgent: boolean;
};

const EMPTY: JobValues = {
  title: '',
  description: '',
  requirements: [],
  payAmount: '',
  payUnit: 'hour',
  district: '',
  address: '',
  schedule: '',
  tags: [],
  isUrgent: false,
};

export function JobForm({ id, initial }: { id?: string; initial?: Partial<JobValues> }) {
  const router = useRouter();
  const [v, setV] = useState<JobValues>({ ...EMPTY, ...initial });
  const [req, setReq] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (p: Partial<JobValues>) => setV((s) => ({ ...s, ...p }));

  function addReq() {
    const r = req.trim();
    if (r && !v.requirements.includes(r) && v.requirements.length < 10) set({ requirements: [...v.requirements, r] });
    setReq('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!v.payAmount) return setErr('Цалингийн дүн заавал');
    setBusy(true);
    const body = { ...v, payAmount: Number(v.payAmount), address: v.address || undefined };
    const r = id ? await api(`/api/jobs/${id}`, 'PATCH', body) : await api<{ id: string }>('/api/jobs', 'POST', body);
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    requestPushPromptLater();
    const newId = id ?? (r.data as { id: string }).id;
    router.push(`/employer/jobs/${newId}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="Ажлын нэр">
        <input className="input" value={v.title} onChange={(e) => set({ title: e.target.value })} placeholder="Жишээ нь: Бармены туслах" required maxLength={80} />
      </Field>

      <div>
        <span className="label">Цалин (заавал)</span>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              className="input pr-10"
              inputMode="numeric"
              type="number"
              min={1000}
              step={500}
              value={v.payAmount}
              onChange={(e) => set({ payAmount: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="8000"
              required
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted">₮</span>
          </div>
          <select className="input w-32" value={v.payUnit} onChange={(e) => set({ payUnit: e.target.value as PayUnit })}>
            {(Object.keys(PAY_UNITS) as PayUnit[]).map((u) => (
              <option key={u} value={u}>
                / {PAY_UNITS[u]}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-1 text-xs text-muted">«Тохиролцоно» гэж бичихгүй — тодорхой дүн оруулна.</p>
      </div>

      <Field label="Хуваарь (заавал)" hint="Жишээ нь: Бя, Ня 09:00–15:00">
        <input className="input" value={v.schedule} onChange={(e) => set({ schedule: e.target.value })} required maxLength={80} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Дүүрэг (заавал)">
          <DistrictSelect value={v.district} onChange={(district) => set({ district })} />
        </Field>
        <Field label="Хаяг">
          <input className="input" value={v.address} onChange={(e) => set({ address: e.target.value })} placeholder="1-р хороо, ... төвийн 2 давхар" maxLength={200} />
        </Field>
      </div>

      <Field label="Хийх ажил">
        <textarea className="input py-3" rows={5} value={v.description} onChange={(e) => set({ description: e.target.value })} required minLength={20} maxLength={3000} />
      </Field>

      <div>
        <span className="label">Шаардлага</span>
        <div className="flex gap-2">
          <input
            className="input"
            value={req}
            onChange={(e) => setReq(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addReq();
              }
            }}
            placeholder="Жишээ нь: 18+ нас"
            maxLength={80}
          />
          <button type="button" className="btn-ghost" onClick={addReq} aria-label="Нэмэх">
            <Plus size={18} />
          </button>
        </div>
        {v.requirements.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {v.requirements.map((r) => (
              <span key={r} className="chip gap-1 pr-1">
                {r}
                <button type="button" className="flex h-8 w-8 items-center justify-center" onClick={() => set({ requirements: v.requirements.filter((x) => x !== r) })} aria-label={`${r} хасах`}>
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <span className="label">Шошго</span>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TAGS) as JobTag[]).map((t) => {
            const on = v.tags.includes(t);
            return (
              <button type="button" key={t} aria-pressed={on} className={clsx('chip', on && 'chip-active')} onClick={() => set({ tags: on ? v.tags.filter((x) => x !== t) : [...v.tags, t] })}>
                {TAGS[t]}
              </button>
            );
          })}
        </div>
      </div>

      <label className={clsx('flex min-h-[56px] cursor-pointer items-center gap-3 rounded-card border p-4', v.isUrgent ? 'border-urgent/60 bg-[#2a1f08]' : 'border-line bg-surface')}>
        <input type="checkbox" checked={v.isUrgent} onChange={(e) => set({ isUrgent: e.target.checked })} className="h-5 w-5 accent-[var(--urgent)]" />
        <Zap size={18} className="text-urgent" />
        <span>
          <span className="block font-semibold">Яаралтай</span>
          <span className="block text-xs text-muted">Нийтлэгдэхэд танай дүүргийн тохирох оюутнуудад мэдэгдэл очно</span>
        </span>
      </label>

      {err && <p className="text-sm text-danger">{err}</p>}
      <button className="btn-primary w-full min-h-[52px]" disabled={busy}>
        {busy ? 'Хадгалж байна…' : id ? 'Хадгалах (дахин шалгалтад орно)' : 'Шалгуулахаар илгээх'}
      </button>
      <p className="text-center text-xs text-muted">Зар нийтлэгдэхээс өмнө админ шалгана.</p>
    </form>
  );
}
