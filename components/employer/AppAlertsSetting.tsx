'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { api } from '@/lib/client';

type Value = 'each' | 'hourly';

/** Шинэ өргөдөл бүрт push авах уу, цагт нэг удаа уу. Апп доторх мэдэгдэл бүгд хэвээр ирнэ. */
export function AppAlertsSetting({ initial }: { initial: Value }) {
  const [value, setValue] = useState<Value>(initial);
  const [err, setErr] = useState('');
  return (
    <div className="space-y-2.5 px-4 py-3">
      <div>
        <p>Шинэ өргөдлийн push</p>
        <p className="text-xs text-muted">
          {value === 'each' ? 'Өргөдөл бүр ирэхэд утсанд мэдэгдэл очно.' : 'Олон өргөдөл ирсэн ч утсанд цагт нэг л удаа мэдэгдэнэ.'}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-btn border border-line bg-sunken p-1" role="radiogroup" aria-label="Шинэ өргөдлийн push">
        {([
          ['each', 'Өргөдөл бүрт'],
          ['hourly', 'Цагт нэг удаа'],
        ] as const).map(([v, l]) => (
          <button
            key={v}
            role="radio"
            aria-checked={value === v}
            onClick={async () => {
              if (v === value) return;
              const prev = value;
              setValue(v);
              const r = await api('/api/profile/alerts', 'PATCH', { appAlerts: v });
              if (!r.ok) {
                setValue(prev);
                setErr(r.error);
              }
            }}
            className={clsx('min-h-[40px] rounded-[10px] text-sm font-semibold', value === v ? 'bg-accent text-accent-ink' : 'text-soft')}
          >
            {l}
          </button>
        ))}
      </div>
      {err && <p className="text-xs text-danger">{err}</p>}
    </div>
  );
}
