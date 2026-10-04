'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Lock, Phone, Star, X } from 'lucide-react';
import { Avatar, Rating } from '@/components/ui';
import { api } from '@/lib/client';
import { timeAgo } from '@/lib/config';

type Profile = {
  name: string;
  school?: string;
  course?: number;
  district?: string;
  availability: string[];
  bio?: string;
  ratingAvg: number;
  ratingCount: number;
  completed: number;
  noShows: number;
  tags: { tag: string; n: number }[];
  reviews: { stars: number; tags: string[]; comment?: string; at: string }[];
  phone: string | null;
  since: string;
  message?: string;
};

/** Оюутны бүтэн профайл: өмнөх ажил олгогчдын үнэлгээ, шошго, ирц. */
export function StudentProfileDialog({ applicationId, onClose }: { applicationId: string; onClose: () => void }) {
  const [p, setP] = useState<Profile | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    api<Profile>(`/api/applications/${applicationId}/student`).then((r) => {
      if (!alive) return;
      if (r.ok) setP(r.data);
      else setErr(r.error);
    });
    return () => {
      alive = false;
    };
  }, [applicationId]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Оюутны профайл"
        className="safe-bottom max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[24px] border border-line bg-surface p-5 sm:rounded-[24px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex justify-end">
          <button className="icon-btn" onClick={onClose} aria-label="Хаах">
            <X size={18} />
          </button>
        </div>
        {err && <p className="text-sm text-danger">{err}</p>}
        {!p && !err && <p className="py-10 text-center text-sm text-muted">Ачаалж байна…</p>}
        {p && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar name={p.name} size="lg" />
              <div className="min-w-0">
                <p className="h-display text-xl">{p.name}</p>
                <p className="text-sm text-muted">{[p.school, p.course && `${p.course}-р курс`, p.district].filter(Boolean).join(' · ')}</p>
                <Rating avg={p.ratingAvg} count={p.ratingCount} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-btn bg-sunken p-3">
                <p className="h-display text-xl">{p.completed}</p>
                <p className="text-[11px] text-muted">Ажилласан</p>
              </div>
              <div className="rounded-btn bg-sunken p-3">
                <p className="h-display text-xl">{p.ratingCount}</p>
                <p className="text-[11px] text-muted">Үнэлгээ</p>
              </div>
              <div className={`rounded-btn p-3 ${p.noShows ? 'bg-[#2a1212]' : 'bg-sunken'}`}>
                <p className={`h-display text-xl ${p.noShows ? 'text-[#F26B6B]' : ''}`}>{p.noShows}</p>
                <p className="text-[11px] text-muted">Ирээгүй</p>
              </div>
            </div>
            {p.noShows > 0 && (
              <p className="flex items-center gap-2 text-sm text-urgent">
                <AlertTriangle size={16} /> Өмнөх ажил олгогч «Ирээгүй» гэж тэмдэглэсэн байна
              </p>
            )}

            {p.message && <p className="rounded-btn bg-sunken p-3 text-sm text-soft">“{p.message}”</p>}
            {p.bio && <p className="text-sm text-soft">{p.bio}</p>}
            {p.availability.length > 0 && (
              <p className="text-sm">
                <span className="text-muted">Чөлөөт цаг:</span> {p.availability.join(', ')}
              </p>
            )}

            {p.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {p.tags.map((t) => (
                  <span key={t.tag} className="badge border border-green-line bg-green-bg py-1 text-green-soft">
                    {t.tag} · {t.n}
                  </span>
                ))}
              </div>
            )}

            {p.reviews.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-bold">Өмнөх ажил олгогчдын сэтгэгдэл</h3>
                {p.reviews.map((r, i) => (
                  <div key={i} className="rounded-btn border border-line bg-sunken p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="flex gap-0.5 text-star">
                        {Array.from({ length: 5 }).map((_, k) => (
                          <Star key={k} size={12} fill={k < r.stars ? 'currentColor' : 'none'} />
                        ))}
                      </span>
                      <span className="text-[11px] text-muted">{timeAgo(r.at)}</span>
                    </div>
                    {r.tags.length > 0 && <p className="mt-1 text-xs text-green-soft">{r.tags.join(' · ')}</p>}
                    {r.comment && <p className="mt-1 text-soft">{r.comment}</p>}
                  </div>
                ))}
              </section>
            )}
            {p.reviews.length === 0 && <p className="text-sm text-muted">Одоогоор үнэлгээ аваагүй шинэ оюутан.</p>}

            {p.phone ? (
              <a href={`tel:+976${p.phone.replace(/\s/g, '')}`} className="btn-primary w-full">
                <Phone size={16} /> +976 {p.phone}
              </a>
            ) : (
              <p className="flex items-center gap-2 text-xs text-muted">
                <Lock size={14} /> Утасны дугаар урьсны дараа харагдана
              </p>
            )}
            <p className="text-center text-[11px] text-muted">{timeAgo(p.since)} бүртгүүлсэн</p>
          </div>
        )}
      </div>
    </div>
  );
}
