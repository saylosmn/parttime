'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

type Toast = { id: number; text: string; kind: 'ok' | 'err' };

/** Хаанаас ч дуудаж болно: toast('Урилга илгээгдлээ'). Үйлдэл амжилттай болсныг хэрэглэгчид мэдэгдэнэ. */
export function toast(text: string, kind: 'ok' | 'err' = 'ok') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('tsag:toast', { detail: { text, kind } }));
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    let n = 0;
    const on = (e: Event) => {
      const { text, kind } = (e as CustomEvent<{ text: string; kind: 'ok' | 'err' }>).detail;
      const id = ++n;
      setItems((s) => [...s.slice(-2), { id, text, kind }]);
      setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), kind === 'err' ? 5000 : 3000);
    };
    window.addEventListener('tsag:toast', on);
    return () => window.removeEventListener('tsag:toast', on);
  }, []);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(80px+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6"
    >
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          className={clsx(
            'pointer-events-auto flex max-w-md items-center gap-2 rounded-btn border px-4 py-3 text-sm font-semibold',
            t.kind === 'ok' ? 'border-green-line bg-green-bg text-green-soft' : 'border-[#5c2626] bg-[#2a1212] text-[#F26B6B]',
          )}
        >
          {t.kind === 'ok' ? <CheckCircle2 size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
          {t.text}
        </div>
      ))}
    </div>
  );
}
