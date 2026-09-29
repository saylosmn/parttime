import { Zap } from 'lucide-react';
import { pageUser } from '@/lib/guards';
import { Job, Payment } from '@/models';
import { BANK, FEATURE_PRICE, formatDateTime } from '@/lib/config';
import { getOrCreateOpenPayment } from '@/lib/payments';
import { PaymentPanel, type PayJob } from '@/components/employer/Billing';

export const metadata = { title: 'Төлбөр' };
export const dynamic = 'force-dynamic';

const STATUS = {
  pending: { label: 'Гүйлгээг шалгаж байна', cls: 'bg-[#2a1f08] text-urgent' },
  confirmed: { label: 'Баталгаажсан', cls: 'bg-green-bg text-green-soft border border-green-line' },
  rejected: { label: 'Татгалзсан', cls: 'bg-[#2a1212] text-[#F26B6B]' },
  cancelled: { label: 'Цуцалсан', cls: 'bg-surface-2 text-muted' },
} as const;

// Онлайн төлбөр (QPay) одоохондоо байхгүй: дансаар шилжүүлж, админ Telegram-аар мэдээлэл аваад баталгаажуулна.
export default async function BillingPage({ searchParams }: { searchParams: { job?: string } }) {
  const me = await pageUser(['employer']);
  const jobs = await Job.find({ employerId: me.id, status: 'active' }, 'title isFeatured featuredUntil').sort({ createdAt: -1 }).lean();
  const payJobs: PayJob[] = jobs.map((j) => ({
    id: j._id.toString(),
    title: j.title,
    featuredUntil: j.isFeatured && j.featuredUntil && j.featuredUntil > new Date() ? new Date(j.featuredUntil).toLocaleDateString('mn-MN') : null,
  }));

  // Сонгосон зарын гүйлгээний утгыг шууд харуулна (товч дарах шаардлагагүй)
  const selected = payJobs.find((j) => j.id === searchParams.job) ?? payJobs[0];
  const open = selected ? await getOrCreateOpenPayment(me.id, selected.id) : null;

  const history = await Payment.find({ employerId: me.id, status: { $in: ['pending', 'confirmed', 'rejected', 'cancelled'] }, paidAt: { $exists: true } })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('jobId', 'title')
    .lean();
  const telegram = process.env.NEXT_PUBLIC_TELEGRAM_CONTACT || null;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="h-display text-2xl">Онцлох зар</h1>

      <div className="card-green p-5">
        <p className="flex items-center gap-2 font-bold">
          <Zap size={18} className="text-urgent" /> {FEATURE_PRICE.amount.toLocaleString('en-US')}₮ / {FEATURE_PRICE.days} хоног
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-green-soft">
          <li>Жагсаалтын хамгийн дээр ногоон картаар харагдана</li>
          <li>Оюутнуудын анхаарлыг илүү татаж, өргөдөл хурдан ирнэ</li>
        </ul>
      </div>

      {!selected || !open ? (
        <div className="card p-5 text-sm text-muted">
          Нийтлэгдсэн зар алга. Зар тань админ шалгаад нийтлэгдсэний дараа онцлох болгох боломжтой.
        </div>
      ) : (
        <PaymentPanel
          bank={BANK}
          jobs={payJobs}
          selectedId={selected.id}
          payment={{ id: open._id.toString(), code: open.code, amount: open.amount, status: open.status as 'awaiting' | 'pending' }}
          telegram={telegram}
        />
      )}

      {history.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="font-bold">Төлбөрийн түүх</h2>
          <div className="card divide-y divide-line">
            {history.map((p) => {
              const s = STATUS[p.status as keyof typeof STATUS];
              return (
                <div key={p._id.toString()} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{(p.jobId as { title?: string })?.title ?? 'Устгагдсан зар'}</p>
                    <p className="text-xs text-muted">
                      Утга <b className="text-soft">{p.code}</b> · {p.amount.toLocaleString('en-US')}₮ · {formatDateTime(p.paidAt ?? p.createdAt)}
                      {p.status === 'rejected' && p.note && ` · ${p.note}`}
                    </p>
                  </div>
                  {s && <span className={`badge shrink-0 ${s.cls}`}>{s.label}</span>}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
