import Link from 'next/link';
import { Inbox, Plus, Zap } from 'lucide-react';
import { pageUser } from '@/lib/guards';
import { Application, Job, User } from '@/models';
import { loadApplicants } from '@/lib/employer';
import { applicationCounts } from '@/lib/services';
import { LIMITS } from '@/lib/config';
import { EmptyState, Stat } from '@/components/ui';
import { BellButton } from '@/components/Nav';
import { PushPrompt } from '@/components/Pwa';
import { ApplicantList } from '@/components/employer/Applicants';
import { JobStatusBadge } from '@/components/employer/JobStatusBadge';

export const metadata = { title: 'Самбар' };
export const dynamic = 'force-dynamic';

export default async function EmployerDashboard() {
  const me = await pageUser(['employer']);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400_000);
  const weekAhead = new Date(now.getTime() + 7 * 86400_000);

  const [user, jobs, newApps, interviews, fresh] = await Promise.all([
    User.findById(me.id).lean(),
    Job.find({ employerId: me.id, status: { $ne: 'closed' } }).sort({ createdAt: -1 }).limit(6).lean(),
    Application.countDocuments({ employerId: me.id, createdAt: { $gte: weekAgo } }),
    Application.countDocuments({ employerId: me.id, status: 'invited', interviewAt: { $gte: now, $lte: weekAhead } }),
    loadApplicants(me.id, { statuses: ['sent', 'viewed'] }, 8),
  ]);
  const active = jobs.filter((j) => j.status === 'active');
  const featured = active.filter((j) => j.isFeatured).length;
  const counts = await applicationCounts(jobs.map((j) => j._id));
  const rated = (user?.ratingCount ?? 0) >= LIMITS.minRatingsForAvg;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Сайн байна уу, {user?.companyName}</p>
          <h1 className="h-display mt-1 text-3xl">Самбар</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/employer/jobs/new" className="btn-primary lg:hidden" aria-label="Шинэ зар">
            <Plus size={18} />
          </Link>
          <BellButton />
        </div>
      </header>

      <PushPrompt />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Идэвхтэй зар" value={active.length} hint={featured ? `${featured} нь онцлох` : undefined} />
        <Stat label="Шинэ өргөдөл" value={newApps} hint="Сүүлийн 7 хоногт" />
        <Stat label="Ярилцлага" value={interviews} hint="Ойрын 7 хоногт" />
        <Stat label="Таны үнэлгээ" value={rated ? user!.ratingAvg.toFixed(1) : 'Шинэ'} hint={`${user?.ratingCount ?? 0} үнэлгээ`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">Шинэ өргөдлүүд</h2>
            <Link href="/employer/applications" className="text-sm text-muted hover:text-text">
              Бүгдийг харах
            </Link>
          </div>
          {fresh.length === 0 ? (
            <EmptyState icon={<Inbox size={22} />} title="Шинэ өргөдөл алга" body="Зар нийтлэгдмэгц оюутнуудын өргөдөл энд харагдана." />
          ) : (
            <ApplicantList items={fresh} showJob compact />
          )}
        </section>

        <div className="space-y-5">
          <section className="card p-5">
            <h2 className="mb-4 text-lg font-bold">Миний зарууд</h2>
            {jobs.length === 0 ? (
              <Link href="/employer/jobs/new" className="btn-primary w-full">
                <Plus size={18} /> Анхны зараа нэмэх
              </Link>
            ) : (
              <div className="space-y-2.5">
                {jobs.map((j) => {
                  const days = Math.max(0, Math.ceil((new Date(j.expiresAt).getTime() - now.getTime()) / 86400_000));
                  return (
                    <Link key={j._id.toString()} href={`/employer/jobs/${j._id}`} className="block rounded-card border border-line bg-sunken p-4 hover:bg-surface-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-bold">{j.title}</p>
                        <JobStatusBadge status={j.status} />
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {j.status === 'pending'
                          ? 'Админ шалгаж байна'
                          : j.status === 'rejected'
                            ? `Татгалзсан: ${j.rejectReason ?? ''}`
                            : `${counts.get(j._id.toString()) ?? 0} өргөдөл · ${days} хоног үлдсэн`}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section className="card-green p-5">
            <p className="flex items-center gap-2 font-bold">
              <Zap size={18} className="text-urgent" /> Яаралтай хүн хэрэгтэй юу?
            </p>
            <p className="mt-2 text-sm text-green-soft">Зараа онцлох болговол жагсаалтын дээр гарч, ойр байгаа оюутнууд руу мэдэгдэл очно.</p>
            <Link href="/employer/billing" className="btn-primary mt-4 w-full">
              Онцлох болгох · 10,000₮
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
