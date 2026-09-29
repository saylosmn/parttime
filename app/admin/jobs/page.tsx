import { pageUser } from '@/lib/guards';
import Link from 'next/link';
import clsx from 'clsx';
import { Job } from '@/models';
import { formatPay, type PayUnit } from '@/lib/config';
import { JobStatusBadge } from '@/components/employer/JobStatusBadge';
import { JobAdminActions } from '@/components/admin/AdminActions';

export const metadata = { title: 'Бүх зар' };
export const dynamic = 'force-dynamic';

const FILTERS = ['active', 'pending', 'rejected', 'closed'] as const;
const LABEL = { active: 'Идэвхтэй', pending: 'Хүлээгдэж буй', rejected: 'Татгалзсан', closed: 'Хаагдсан' };

export default async function AdminJobs({ searchParams }: { searchParams: { status?: string } }) {
  await pageUser(['admin']);
  const status = (FILTERS as readonly string[]).includes(searchParams.status ?? '') ? (searchParams.status as (typeof FILTERS)[number]) : 'active';
  const jobs = await Job.find({ status }).sort({ createdAt: -1 }).limit(100).populate('employerId', 'name companyName').lean();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link key={f} href={`/admin/jobs?status=${f}`} className={clsx('chip', f === status && 'chip-active')}>
            {LABEL[f]}
          </Link>
        ))}
      </div>
      {jobs.map((j) => {
        const e = j.employerId as any;
        const featured = Boolean(j.isFeatured && (!j.featuredUntil || new Date(j.featuredUntil) > new Date()));
        return (
          <div key={j._id.toString()} className="card space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link href={`/jobs/${j._id}`} className="font-bold hover:underline">
                  {j.title}
                </Link>
                <p className="text-sm text-muted">
                  {e?.companyName || e?.name} · {formatPay(j.payAmount, j.payUnit as PayUnit)} · {j.district}
                  {featured && j.featuredUntil && ` · Онцлох ${new Date(j.featuredUntil).toLocaleDateString('mn-MN')} хүртэл`}
                </p>
              </div>
              <JobStatusBadge status={j.status} />
            </div>
            <JobAdminActions id={j._id.toString()} featured={featured} status={j.status} />
          </div>
        );
      })}
      {jobs.length === 0 && <p className="text-sm text-muted">Зар алга.</p>}
    </div>
  );
}
