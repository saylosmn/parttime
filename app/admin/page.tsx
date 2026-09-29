import { pageUser } from '@/lib/guards';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { Job } from '@/models';
import { formatPay, timeAgo, TAGS, type JobTag, type PayUnit } from '@/lib/config';
import { EmptyState, Verified } from '@/components/ui';
import { PendingJobActions } from '@/components/admin/AdminActions';

export const metadata = { title: 'Админ' };
export const dynamic = 'force-dynamic';

export default async function AdminPending() {
  await pageUser(['admin']);
  const jobs = await Job.find({ status: 'pending' }).sort({ createdAt: 1 }).populate('employerId', 'name companyName verified email phone').lean();
  return (
    <div className="space-y-3">
      <h1 className="h-display text-2xl">Хүлээгдэж буй зарууд</h1>
      {jobs.length === 0 ? (
        <EmptyState icon={<CheckCircle2 size={22} />} title="Шалгах зар алга" />
      ) : (
        jobs.map((j) => {
          const e = j.employerId as any;
          return (
            <div key={j._id.toString()} className="card space-y-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link href={`/jobs/${j._id}`} className="text-lg font-bold hover:underline">
                    {j.title}
                  </Link>
                  <p className="flex items-center gap-1 text-sm text-muted">
                    {e?.companyName || e?.name} {e?.verified && <Verified />} · {e?.email} · {timeAgo(j.createdAt)}
                  </p>
                </div>
                <p className="font-display font-bold text-accent">{formatPay(j.payAmount, j.payUnit as PayUnit)}</p>
              </div>
              <p className="text-sm text-soft">
                {j.schedule} · {j.district}
                {j.address && `, ${j.address}`}
                {j.isUrgent && <span className="badge ml-2 bg-urgent text-accent-ink">Яаралтай</span>}
              </p>
              <p className="line-clamp-4 whitespace-pre-line text-sm text-muted">{j.description}</p>
              {(j.requirements.length > 0 || j.tags.length > 0) && (
                <p className="text-xs text-muted">
                  {[...j.requirements, ...(j.tags as JobTag[]).map((t) => TAGS[t])].join(' · ')}
                </p>
              )}
              <PendingJobActions id={j._id.toString()} />
            </div>
          );
        })
      )}
    </div>
  );
}
