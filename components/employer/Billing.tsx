'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Send, X } from 'lucide-react';
import { api } from '@/lib/client';

function CopyRow({ label, value, mono = false, highlight = false }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={`flex min-h-[52px] items-center justify-between gap-3 px-4 ${highlight ? 'bg-green-bg' : ''}`}>
      <span className={`text-sm ${highlight ? 'font-semibold text-green-soft' : 'text-muted'}`}>{label}</span>
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
        <span className={`${mono ? 'font-mono tracking-wide' : ''} ${highlight ? 'h-display text-2xl tracking-[0.25em] text-accent' : ''}`}>{value}</span>
        {copied ? <Check size={16} className="text-accent" /> : <Copy size={16} className="text-muted" />}
      </button>
    </div>
  );
}

export type PayJob = { id: string; title: string; featuredUntil: string | null };
type Bank = { bankName: string; iban: string; account: string; holder: string };
type OpenPayment = { id: string; code: string; amount: number; status: 'awaiting' | 'pending' };

export function PaymentPanel({
  bank,
  jobs,
  selectedId,
  payment,
  telegram,
}: {
  bank: Bank;
  jobs: PayJob[];
  selectedId: string;
  payment: OpenPayment;
  telegram: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const selected = jobs.find((j) => j.id === selectedId);

  async function act(action: 'paid' | 'cancel') {
    setBusy(true);
    setErr('');
    const r = await api(`/api/payments/${payment.id}`, 'PATCH', { action });
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    router.refresh();
  }

  return (
    <section className="card space-y-4 p-5">
      <div>
        <label className="label" htmlFor="pay-job">Онцлох болгох зар</label>
        <select
          id="pay-job"
          className="input"
          value={selectedId}
          disabled={busy}
          onChange={(e) => router.push(`/employer/billing?job=${e.target.value}`)}
        >
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title}
              {j.featuredUntil ? ` (онцлох · ${j.featuredUntil} хүртэл)` : ''}
            </option>
          ))}
        </select>
        {selected?.featuredUntil && <p className="mt-1 text-xs text-muted">Төлбөр баталгаажвал онцлох хугацаа {selected.featuredUntil}-аас цааш сунгагдана.</p>}
      </div>

      <div>
        <p className="label">Дараах дансанд шилжүүлнэ</p>
        <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-sunken">
          <CopyRow label="Банк" value={bank.bankName} />
          <CopyRow label="IBAN" value={bank.iban} mono />
          <CopyRow label="Дансны дугаар" value={bank.account} mono />
          <CopyRow label="Данс эзэмшигч" value={bank.holder} />
          <CopyRow label="Дүн" value={`${payment.amount.toLocaleString('en-US')}₮`} />
          <CopyRow label="Гүйлгээний утга" value={payment.code} highlight />
        </div>
        <p className="mt-2 text-xs text-muted">
          Гүйлгээний утга дээр <b className="text-soft">зөвхөн {payment.code}</b> гэж бичнэ. Энэ кодоор таны төлбөрийг таньж, зарыг тань онцлох болгоно.
        </p>
      </div>

      {payment.status === 'awaiting' ? (
        <div className="space-y-2">
          <button className="btn-primary w-full" disabled={busy} onClick={() => act('paid')}>
            <Check size={18} /> Төлбөр шилжүүлсэн
          </button>
          <p className="text-center text-xs text-muted">Шилжүүлсний дараа дарна уу — бид гүйлгээг шалгаад баталгаажуулна.</p>
        </div>
      ) : (
        <div className="rounded-btn border border-urgent/40 bg-[#2a1f08] p-4 text-sm">
          <p className="font-semibold text-urgent">Гүйлгээг шалгаж байна</p>
          <p className="mt-1 text-soft">Таны гүйлгээг шалгаж байна. Баталгаажмагц зар тань онцлох болж, танд мэдэгдэл очно.</p>
        </div>
      )}

      <button
        className="btn-ghost w-full text-danger"
        disabled={busy}
        onClick={() => confirm(`Гүйлгээ ${payment.code}-ийг цуцлах уу?${payment.status === 'pending' ? ' Хэрэв мөнгө шилжүүлсэн бол бидэнтэй холбогдоно уу.' : ''}`) && act('cancel')}
      >
        <X size={16} /> Гүйлгээ цуцлах
      </button>

      {telegram && (
        <a href={`https://t.me/${telegram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" className="btn-ghost w-full">
          <Send size={16} /> Telegram-аар холбогдох
        </a>
      )}
      {err && <p className="text-sm text-danger">{err}</p>}
    </section>
  );
}
