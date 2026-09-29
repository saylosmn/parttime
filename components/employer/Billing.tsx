'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Send } from 'lucide-react';
import { api } from '@/lib/client';

function CopyRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-3 px-4">
      <span className="text-sm text-muted">{label}</span>
      <button
        type="button"
        className="flex min-h-[44px] items-center gap-2 text-right font-semibold"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {}
        }}
        aria-label={`${label} хуулах`}
      >
        <span className={mono ? 'font-mono tracking-wide' : ''}>{value}</span>
        {copied ? <Check size={16} className="text-accent" /> : <Copy size={16} className="text-muted" />}
      </button>
    </div>
  );
}

export function BankCard({
  bank,
  amount,
  telegram,
}: {
  bank: { bankName: string; iban: string; account: string; holder: string };
  amount: number;
  telegram: string | null;
}) {
  return (
    <div className="space-y-3">
      <div className="divide-y divide-line rounded-card border border-line bg-sunken">
        <CopyRow label="Банк" value={bank.bankName} />
        <CopyRow label="IBAN" value={bank.iban} mono />
        <CopyRow label="Дансны дугаар" value={bank.account} mono />
        <CopyRow label="Данс эзэмшигч" value={bank.holder} />
        <CopyRow label="Дүн" value={`${amount.toLocaleString('en-US')}₮`} />
      </div>
      {telegram && (
        <a href={`https://t.me/${telegram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" className="btn-ghost w-full">
          <Send size={16} /> Telegram-аар холбогдох
        </a>
      )}
    </div>
  );
}

export type PayJob = { id: string; title: string; featuredUntil: string | null; pendingCode: string | null };

export function PayForJob({ jobs, amount }: { jobs: PayJob[]; amount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [codes, setCodes] = useState<Record<string, string>>(
    Object.fromEntries(jobs.filter((j) => j.pendingCode).map((j) => [j.id, j.pendingCode as string])),
  );

  return (
    <div className="space-y-2.5">
      {jobs.map((j) => {
        const code = codes[j.id];
        return (
          <div key={j.id} className="rounded-card border border-line bg-sunken p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{j.title}</p>
                <p className="text-xs text-muted">{j.featuredUntil ? `Онцлох · ${j.featuredUntil} хүртэл` : 'Энгийн зар'}</p>
              </div>
              {!code && (
                <button
                  className="btn-primary shrink-0"
                  disabled={busy === j.id}
                  onClick={async () => {
                    setBusy(j.id);
                    setErr('');
                    const r = await api<{ code: string }>('/api/payments', 'POST', { jobId: j.id });
                    setBusy(null);
                    if (!r.ok) return setErr(r.error);
                    setCodes((c) => ({ ...c, [j.id]: r.data.code }));
                    router.refresh();
                  }}
                >
                  {j.featuredUntil ? 'Сунгах' : 'Төлбөр төлөх'}
                </button>
              )}
            </div>
            {code && (
              <div className="mt-3 rounded-btn border border-green-line bg-green-bg p-4 text-center">
                <p className="text-xs text-green-soft">Гүйлгээний утга дээр бичих код</p>
                <p className="h-display mt-1 text-4xl tracking-[0.3em] text-accent">{code}</p>
                <p className="mt-2 text-xs text-green-soft">
                  {amount.toLocaleString('en-US')}₮-ийг дээрх дансанд шилжүүлээд, утга дээр зөвхөн <b>{code}</b> гэж бичнэ. Telegram-аар баталгаажмагц танд мэдэгдэл очно.
                </p>
              </div>
            )}
          </div>
        );
      })}
      {err && <p className="text-sm text-danger">{err}</p>}
    </div>
  );
}
