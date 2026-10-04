import Link from 'next/link';
import { FileText, Plus } from 'lucide-react';
import { pageUser } from '@/lib/guards';
import { Job } from '@/models';
import { applicationCounts } from '@/lib/services';
import { formatPay, type PayUnit } from '@/lib/config';
import { EmptyState } from '@/components/ui';
import { JobStatusBadge } from '@/components/employer/JobStatusBadge';

export const metadata = { title: 'Миний зарууд' };
export const dynamic = 'force-dynamic';

export default async function EmployerJobs() {
  const me = await pageUser(['employer']);
  const jobs = await Job.find({ employerId: me.id }).sort({ createdAt: -1 }).lean();
  const counts = await applicationCounts(jobs.map((j) => j._id));
  // Server component: хүсэлт бүрт нэг удаа ажилладаг тул цаг авах нь зөв
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="h-display text-2xl">Миний зарууд</h1>
        <Link href="/employer/jobs/new" className="btn-primary">
          <Plus size={18} /> Шинэ зар
        </Link>
      </div>
      {jobs.length === 0 ? (
        <EmptyState icon={<FileText size={22} />} title="Зар алга" body="Анхны зараа нэмээд оюутнуудаас өргөдөл аваарай." />
      ) : (
        <div className="space-y-3">
          {jobs.map((j) => {
            const days = Math.max(0, Math.ceil((new Date(j.expiresAt).getTime() - now) / 86400_000));
            return (
              <Link key={j._id.toString()} href={`/employer/jobs/${j._id}`} className="card flex items-center gap-4 p-4 hover:bg-surface-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-bold">{j.title}</p>
                    {j.isFeatured && <span className="badge bg-accent text-accent-ink">Онцлох</span>}
                    {j.isUrgent && <span className="badge bg-urgent text-accent-ink">Яаралтай</span>}
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {formatPay(j.payAmount, j.payUnit as PayUnit)} · {j.district} · {counts.get(j._id.toString()) ?? 0} өргөдөл
                    {j.status === 'active' && ` · ${days} хоног үлдсэн`}
                  </p>
                </div>
                <JobStatusBadge status={j.status} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
