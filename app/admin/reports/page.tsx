import { pageUser } from '@/lib/guards';
import Link from 'next/link';
import { Flag } from 'lucide-react';
import { Report } from '@/models';
import { timeAgo } from '@/lib/config';
import { EmptyState } from '@/components/ui';
import { JobAdminActions, ResolveReport } from '@/components/admin/AdminActions';

export const metadata = { title: 'Гомдол' };
export const dynamic = 'force-dynamic';

export default async function AdminReports() {
  await pageUser(['admin']);
  const reports = await Report.find({ resolved: false })
    .sort({ createdAt: -1 })
    .populate('jobId', 'title status isFeatured')
    .populate('reporterId', 'name email')
    .lean();
  return (
    <div className="space-y-3">
      <h1 className="h-display text-2xl">Гомдол</h1>
      {reports.length === 0 ? (
        <EmptyState icon={<Flag size={22} />} title="Шийдвэрлээгүй гомдол алга" />
      ) : (
        reports.map((r) => {
          const job = r.jobId as any;
          const who = r.reporterId as any;
          return (
            <div key={r._id.toString()} className="card space-y-3 p-4">
              <div>
                <Link href={job ? `/jobs/${job._id}` : '#'} className="font-bold hover:underline">
                  {job?.title ?? 'Устгагдсан зар'}
                </Link>
                <p className="text-xs text-muted">
                  {who?.name} ({who?.email}) · {timeAgo(r.createdAt)}
                </p>
              </div>
              <p className="rounded-btn bg-sunken p-3 text-sm text-soft">{r.reason}</p>
              <div className="flex flex-wrap gap-2">
                <ResolveReport id={r._id.toString()} />
                {job && <JobAdminActions id={job._id.toString()} featured={Boolean(job.isFeatured)} status={job.status} />}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
