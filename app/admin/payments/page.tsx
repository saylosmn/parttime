import clsx from 'clsx';
import Link from 'next/link';
import { Wallet } from 'lucide-react';
import { pageUser } from '@/lib/guards';
import { Payment } from '@/models';
import { BANK, formatDateTime } from '@/lib/config';
import { EmptyState } from '@/components/ui';
import { PaymentActions } from '@/components/admin/AdminActions';

export const metadata = { title: 'Төлбөр' };
export const dynamic = 'force-dynamic';

export default async function AdminPayments({ searchParams }: { searchParams: { status?: string } }) {
  await pageUser(['admin']);
  const status = searchParams.status === 'done' ? 'done' : 'pending';
  const payments = await Payment.find(status === 'pending' ? { status: 'pending' } : { status: { $in: ['confirmed', 'rejected', 'cancelled'] } })
    .sort({ createdAt: status === 'pending' ? 1 : -1 })
    .limit(100)
    .populate('jobId', 'title')
    .populate('employerId', 'name companyName phone email')
    .lean();

  return (
    <div className="space-y-4">
      <h1 className="h-display text-2xl">Төлбөр</h1>
      <p className="text-sm text-muted">
        {BANK.bankName} · {BANK.account} ({BANK.holder}) дансны хуулгаас <b className="text-soft">гүйлгээний утга</b>-аар нь тулгаж баталгаажуулна.
      </p>
      <div className="flex gap-2">
        <Link href="/admin/payments" className={clsx('chip', status === 'pending' && 'chip-active')}>Хүлээгдэж буй</Link>
        <Link href="/admin/payments?status=done" className={clsx('chip', status === 'done' && 'chip-active')}>Шийдвэрлэсэн</Link>
      </div>
      {payments.length === 0 ? (
        <EmptyState icon={<Wallet size={22} />} title={status === 'pending' ? 'Хүлээгдэж буй төлбөр алга' : 'Түүх хоосон'} />
      ) : (
        payments.map((p) => {
          const e = p.employerId as { companyName?: string; name?: string; phone?: string; email?: string } | null;
          const j = p.jobId as { _id?: unknown; title?: string } | null;
          return (
            <div key={p._id.toString()} className="card flex flex-wrap items-center gap-4 p-4">
              <div className="rounded-btn border border-green-line bg-green-bg px-4 py-2 text-center">
                <p className="text-[11px] text-green-soft">Утга</p>
                <p className="h-display text-2xl tracking-widest text-accent">{p.code}</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{p.amount.toLocaleString('en-US')}₮ · {p.days} хоног</p>
                <p className="truncate text-sm text-soft">
                  {e?.companyName || e?.name} {e?.phone && `· ${e.phone}`}
                </p>
                <p className="truncate text-xs text-muted">
                  «{j?.title ?? 'Устгагдсан зар'}» · {formatDateTime(p.createdAt)}
                  {p.note && ` · ${p.note}`}
                </p>
              </div>
              {p.status === 'pending' ? (
                <PaymentActions id={p._id.toString()} />
              ) : (
                <span className={clsx('badge', p.status === 'confirmed' ? 'bg-green-bg text-green-soft' : 'bg-[#2a1212] text-[#F26B6B]')}>
                  {p.status === 'confirmed' ? 'Баталгаажсан' : p.status === 'cancelled' ? 'Цуцалсан' : 'Татгалзсан'}
                </span>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
