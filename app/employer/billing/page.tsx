import { Zap } from 'lucide-react';
import { pageUser } from '@/lib/guards';
import { Job, Payment } from '@/models';
import { BANK, FEATURE_PRICE, formatDateTime } from '@/lib/config';
import { BankCard, PayForJob, type PayJob } from '@/components/employer/Billing';

export const metadata = { title: 'Төлбөр' };
export const dynamic = 'force-dynamic';

const STATUS = {
  pending: { label: 'Шалгаж байна', cls: 'bg-[#2a1f08] text-urgent' },
  confirmed: { label: 'Баталгаажсан', cls: 'bg-green-bg text-green-soft border border-green-line' },
  rejected: { label: 'Татгалзсан', cls: 'bg-[#2a1212] text-[#F26B6B]' },
} as const;

// Онлайн төлбөр (QPay) одоохондоо байхгүй: дансаар шилжүүлж, админ Telegram-аар мэдээлэл аваад баталгаажуулна.
export default async function BillingPage() {
  const me = await pageUser(['employer']);
  const [jobs, payments] = await Promise.all([
    Job.find({ employerId: me.id, status: 'active' }, 'title isFeatured featuredUntil').sort({ createdAt: -1 }).lean(),
    Payment.find({ employerId: me.id }).sort({ createdAt: -1 }).limit(20).populate('jobId', 'title').lean(),
  ]);
  const pendingByJob = new Map(payments.filter((p) => p.status === 'pending').map((p) => [String((p.jobId as { _id?: unknown })?._id ?? p.jobId), p.code]));
  const payJobs: PayJob[] = jobs.map((j) => ({
    id: j._id.toString(),
    title: j.title,
    featuredUntil: j.isFeatured && j.featuredUntil && j.featuredUntil > new Date() ? new Date(j.featuredUntil).toLocaleDateString('mn-MN') : null,
    pendingCode: pendingByJob.get(j._id.toString()) ?? null,
  }));
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

      <section className="card space-y-4 p-5">
        <h2 className="font-bold">Хэрхэн төлөх вэ?</h2>
        <ol className="space-y-2 text-sm text-soft">
          <li><b className="text-text">1.</b> Доороос онцлох болгох зараа сонгоод «Төлбөр төлөх» дарна — танд <b className="text-accent">4 оронтой гүйлгээний утга</b> гарна.</li>
          <li><b className="text-text">2.</b> Доорх дансанд {FEATURE_PRICE.amount.toLocaleString('en-US')}₮ шилжүүлж, <b className="text-text">гүйлгээний утга дээр зөвхөн тэр 4 оронтой кодыг</b> бичнэ.</li>
          <li><b className="text-text">3.</b> Төлбөрийг Telegram-аар баталгаажуулна. Ихэвчлэн хэдэн цагийн дотор зар тань онцлох болж, танд мэдэгдэл очно.</li>
        </ol>
        <BankCard bank={BANK} amount={FEATURE_PRICE.amount} telegram={telegram} />
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-bold">Зар сонгох</h2>
        {payJobs.length === 0 ? (
          <p className="text-sm text-muted">Нийтлэгдсэн зар алга. Зар тань админ шалгаад нийтлэгдсэний дараа онцлох болгох боломжтой.</p>
        ) : (
          <PayForJob jobs={payJobs} amount={FEATURE_PRICE.amount} />
        )}
      </section>

      {payments.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="font-bold">Төлбөрийн түүх</h2>
          <div className="card divide-y divide-line">
            {payments.map((p) => {
              const s = STATUS[p.status as keyof typeof STATUS];
              return (
                <div key={p._id.toString()} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{(p.jobId as { title?: string })?.title ?? 'Устгагдсан зар'}</p>
                    <p className="text-xs text-muted">
                      Утга <b className="text-soft">{p.code}</b> · {p.amount.toLocaleString('en-US')}₮ · {formatDateTime(p.createdAt)}
                      {p.status === 'rejected' && p.note && ` · ${p.note}`}
                    </p>
                  </div>
                  <span className={`badge shrink-0 ${s.cls}`}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
