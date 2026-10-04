import { pageUser } from '@/lib/guards';
import { Application, Job, Payment, User } from '@/models';
import { Stat } from '@/components/ui';

export const metadata = { title: 'Статистик' };
export const dynamic = 'force-dynamic';

const DAYS = 14;
const TZ = 'Asia/Ulaanbaatar';

/** Сүүлийн 14 хоногийн өдөр тутмын тоо (УБ цагаар). */
async function daily(model: typeof User | typeof Job | typeof Application, since: Date, match: Record<string, unknown> = {}) {
  const rows: { _id: string; n: number }[] = await (model as any).aggregate([
    { $match: { createdAt: { $gte: since }, ...match } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } }, n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [r._id, r.n]));
}

export default async function AdminStats() {
  await pageUser(['admin']);
  const now = new Date();
  const since = new Date(now.getTime() - (DAYS - 1) * 86400_000);
  since.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const week = new Date(now.getTime() - 7 * 86400_000);

  const [students, employers, newUsers7, activeJobs, pendingJobs, totalJobs, apps7, totalApps, hired, revenue, revenueMonth, uDaily, jDaily, aDaily] =
    await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'employer' }),
      User.countDocuments({ createdAt: { $gte: week } }),
      Job.countDocuments({ status: 'active', expiresAt: { $gt: now } }),
      Job.countDocuments({ status: 'pending' }),
      Job.countDocuments({}),
      Application.countDocuments({ createdAt: { $gte: week } }),
      Application.countDocuments({}),
      Application.countDocuments({ status: { $in: ['hired', 'completed'] } }),
      Payment.aggregate([{ $match: { status: 'confirmed' } }, { $group: { _id: null, s: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $match: { status: 'confirmed', updatedAt: { $gte: monthStart } } }, { $group: { _id: null, s: { $sum: '$amount' } } }]),
      daily(User, since),
      daily(Job, since),
      daily(Application, since),
    ]);

  const days = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(since.getTime() + i * 86400_000);
    return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
  });
  const series = [
    { label: 'Шинэ хэрэглэгч', data: uDaily, color: 'bg-accent' },
    { label: 'Шинэ зар', data: jDaily, color: 'bg-urgent' },
    { label: 'Өргөдөл', data: aDaily, color: 'bg-green-soft' },
  ];
  const hireRate = totalApps ? Math.round((hired / totalApps) * 100) : 0;
  const fmt = (n: number) => `${n.toLocaleString('en-US')}₮`;

  return (
    <div className="space-y-5">
      <h1 className="h-display text-2xl">Статистик</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Оюутан" value={students} hint={`+${newUsers7} хэрэглэгч 7 хоногт`} />
        <Stat label="Ажил олгогч" value={employers} />
        <Stat label="Идэвхтэй зар" value={activeJobs} hint={`${pendingJobs} шалгах · ${totalJobs} нийт`} />
        <Stat label="Өргөдөл" value={totalApps} hint={`+${apps7} 7 хоногт`} />
        <Stat label="Ажилд орсон" value={hired} hint={`${hireRate}% өргөдлөөс`} />
        <Stat label="Орлого (энэ сар)" value={fmt(revenueMonth[0]?.s ?? 0)} />
        <Stat label="Нийт орлого" value={fmt(revenue[0]?.s ?? 0)} />
      </div>

      {series.map((s) => {
        const vals = days.map((d) => s.data.get(d) ?? 0);
        const max = Math.max(1, ...vals);
        const total = vals.reduce((a, b) => a + b, 0);
        return (
          <section key={s.label} className="card p-5">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-bold">{s.label}</h2>
              <span className="text-sm text-muted">Сүүлийн {DAYS} хоногт: {total}</span>
            </div>
            <div className="flex h-32 items-end gap-1" role="img" aria-label={`${s.label}: ${vals.join(', ')}`}>
              {vals.map((v, i) => (
                <div key={days[i]} className="group relative flex h-full flex-1 flex-col justify-end">
                  <div className={`${s.color} min-h-[2px] rounded-t-[4px]`} style={{ height: `${(v / max) * 100}%` }} />
                  <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 rounded bg-surface-2 px-1.5 text-xs group-hover:block">
                    {v}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] text-muted">
              <span>{days[0].slice(5)}</span>
              <span>{days[DAYS - 1].slice(5)}</span>
            </div>
          </section>
        );
      })}
    </div>
  );
}
