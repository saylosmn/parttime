'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Copy, RotateCcw } from 'lucide-react';
import { api } from '@/lib/client';
import { toast } from '@/components/Toast';

/** Зарын хуудсан дээрх хурдан үйлдлүүд: ажилтан олдсон / дахин нийтлэх / хуулах. */
export function JobActions({ id, status, expired, waiting }: { id: string; status: string; expired: boolean; waiting: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function run(action: 'fill' | 'repost') {
    setBusy(true);
    setMsg('');
    const r = await api<{ rejected?: number; status?: string }>(`/api/jobs/${id}/${action}`, 'POST');
    setBusy(false);
    if (!r.ok) {
      toast(r.error, 'err');
      return setMsg(r.error);
    }
    if (action === 'fill') setMsg(`Зар хаагдлаа. ${r.data.rejected ?? 0} оюутанд хариу автоматаар илгээгдлээ.`);
    else setMsg(r.data.status === 'active' ? 'Зар дахин нийтлэгдлээ (30 хоног).' : 'Зар дахин нийтлэхээр шалгалтад орлоо.');
    toast(action === 'fill' ? 'Зар хаагдаж, оюутнуудад хариу илгээгдлээ' : 'Зар дахин нийтлэгдлээ');
    router.refresh();
  }

  const canRepost = status === 'closed' || status === 'rejected' || (status === 'active' && expired);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status === 'active' && !expired && (
          <button
            className="btn-primary"
            disabled={busy}
            onClick={() =>
              confirm(
                waiting > 0
                  ? `Зарыг хааж, хариу хүлээж буй ${waiting} оюутанд "өөр хүн сонгогдлоо" гэсэн эелдэг хариу автоматаар илгээх үү?`
                  : 'Ажилтан олдсон гэж зарыг хаах уу?',
              ) && run('fill')
            }
          >
            <CheckCircle2 size={16} /> Ажилтан олдсон
          </button>
        )}
        {canRepost && (
          <button className="btn-primary" disabled={busy} onClick={() => run('repost')}>
            <RotateCcw size={16} /> Дахин нийтлэх
          </button>
        )}
        <Link href={`/employer/jobs/new?from=${id}`} className="btn-ghost">
          <Copy size={16} /> Хуулж шинэ зар
        </Link>
      </div>
      {msg && <p className="text-sm text-green-soft">{msg}</p>}
    </div>
  );
}
