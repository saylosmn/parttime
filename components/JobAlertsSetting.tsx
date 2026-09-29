'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { api } from '@/lib/client';

type Value = 'all' | 'district' | 'off';
const OPTIONS: { v: Value; label: string }[] = [
  { v: 'all', label: 'Бүх зар' },
  { v: 'district', label: 'Миний дүүрэг' },
  { v: 'off', label: 'Унтраах' },
];

/** Шинэ ажлын зар нийтлэгдэх бүрт мэдэгдэл авах эсэх. */
export function JobAlertsSetting({ initial, district }: { initial: Value; district?: string }) {
  const [value, setValue] = useState<Value>(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const hint =
    value === 'all'
      ? 'Шинэ зар бүр нийтлэгдэхэд мэдэгдэл авна.'
      : value === 'district'
        ? `Зөвхөн ${district ?? 'таны'} дүүргийн шинэ зарын мэдэгдэл авна.`
        : 'Шинэ зарын мэдэгдэл авахгүй. Өргөдөл, урилгын мэдэгдэл хэвээр ирнэ.';

  return (
    <div className="space-y-2.5 px-4 py-3">
      <div>
        <p>Шинэ зарын мэдэгдэл</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      <div className="grid grid-cols-3 gap-1 rounded-btn border border-line bg-sunken p-1" role="radiogroup" aria-label="Шинэ зарын мэдэгдэл">
        {OPTIONS.map((o) => (
          <button
            key={o.v}
            role="radio"
            aria-checked={value === o.v}
            disabled={saving}
            onClick={async () => {
              if (o.v === value) return;
              const prev = value;
              setValue(o.v);
              setSaving(true);
              setErr('');
              const r = await api('/api/profile/alerts', 'PATCH', { jobAlerts: o.v });
              setSaving(false);
              if (!r.ok) {
                setValue(prev);
                setErr(r.error);
              }
            }}
            className={clsx('min-h-[40px] rounded-[10px] text-sm font-semibold transition-colors', value === o.v ? 'bg-accent text-accent-ink' : 'text-soft')}
          >
            {o.label}
          </button>
        ))}
      </div>
      {err && <p className="text-xs text-danger">{err}</p>}
    </div>
  );
}
