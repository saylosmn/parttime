'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Star } from 'lucide-react';
import { REVIEW_TAGS } from '@/lib/config';
import { api } from '@/lib/client';
import { toast } from '@/components/Toast';

export function ReviewForm({ applicationId, direction }: { applicationId: string; direction: keyof typeof REVIEW_TAGS }) {
  const router = useRouter();
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  if (done) return <p className="text-sm text-green-soft">Баярлалаа! Хоёр тал үнэлсний дараа (эсвэл 7 хоногийн дараа) нийтэд харагдана.</p>;

  return (
    <div className="space-y-3">
      <div className="flex gap-2" role="radiogroup" aria-label="Од">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={stars === n}
            aria-label={`${n} од`}
            onClick={() => setStars(n)}
            className={clsx('flex h-11 w-11 items-center justify-center rounded-btn border', n <= stars ? 'border-star/40 bg-[#2a2410] text-star' : 'border-line text-star/60')}
          >
            <Star size={20} fill={n <= stars ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
      {stars > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            {REVIEW_TAGS[direction].map((t) => {
              const on = tags.includes(t);
              return (
                <button type="button" key={t} aria-pressed={on} onClick={() => setTags(on ? tags.filter((x) => x !== t) : [...tags, t])} className={clsx('chip', on && 'chip-active')}>
                  {t}
                </button>
              );
            })}
          </div>
          <textarea className="input py-3" rows={2} maxLength={300} placeholder="Сэтгэгдэл (заавал биш)" value={comment} onChange={(e) => setComment(e.target.value)} />
          <p className="text-right text-xs text-muted">{comment.length}/300</p>
          {err && <p className="text-sm text-danger">{err}</p>}
          <button
            className="btn-primary w-full"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const r = await api('/api/reviews', 'POST', { applicationId, stars, tags, comment: comment || undefined });
              setBusy(false);
              if (!r.ok) return setErr(r.error);
              toast('Үнэлгээ илгээгдлээ. Баярлалаа!');
              setDone(true);
              router.refresh();
            }}
          >
            Үнэлгээ илгээх
          </button>
        </>
      )}
    </div>
  );
}
