import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Eye, Inbox, Pencil } from 'lucide-react';
import { Types } from 'mongoose';
import { pageUser } from '@/lib/guards';
import { dbConnect } from '@/lib/db';
import { Job } from '@/models';
import { loadApplicants, markViewed } from '@/lib/employer';
import { formatPay, type PayUnit } from '@/lib/config';
import { EmptyState } from '@/components/ui';
import { ApplicantList } from '@/components/employer/Applicants';
import { JobStatusBadge } from '@/components/employer/JobStatusBadge';
import { CloseJobButton } from '@/components/employer/CloseJobButton';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { id: string } }) {
  if (!Types.ObjectId.isValid(params.id)) return { title: 'Зар' };
  await dbConnect();
  const job = await Job.findById(params.id, 'title').lean();
  return { title: job ? `${job.title} · Өргөдлүүд` : 'Зар' };
}

export default async function EmployerJobPage({ params }: { params: { id: string } }) {
  const me = await pageUser(['employer']);
  if (!Types.ObjectId.isValid(params.id)) notFound();
  const job = await Job.findById(params.id).lean();
  if (!job || (job.employerId.toString() !== me.id && me.role !== 'admin')) notFound();

  const employerId = job.employerId.toString();
  // Админ харах үед оюутанд "харлаа" мэдэгдэл явуулахгүй
  if (employerId === me.id) await markViewed(employerId, params.id);
  const apps = await loadApplicants(employerId, { jobId: params.id });
  const groups = [
    { label: 'Шинэ', items: apps.filter((a) => a.status === 'viewed' || a.status === 'sent') },
    { label: 'Урьсан', items: apps.filter((a) => a.status === 'invited') },
    { label: 'Ажилд авсан', items: apps.filter((a) => a.status === 'hired') },
    { label: 'Дууссан', items: apps.filter((a) => a.status === 'completed') },
    { label: 'Татгалзсан', items: apps.filter((a) => a.status === 'rejected') },
  ].filter((g) => g.items.length);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href="/employer/jobs" className="inline-flex min-h-[44px] items-center gap-1 text-sm text-muted">
        <ChevronLeft size={18} /> Миний зарууд
      </Link>
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="h-display text-xl">{job.title}</h1>
              <JobStatusBadge status={job.status} />
            </div>
            <p className="mt-1 text-sm text-muted">
              {formatPay(job.payAmount, job.payUnit as PayUnit)} · {job.schedule} · {job.district}
            </p>
            {job.status === 'rejected' && job.rejectReason && <p className="mt-2 text-sm text-danger">Татгалзсан шалтгаан: {job.rejectReason}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/jobs/${job._id}`} className="btn-ghost">
              <Eye size={16} /> Харах
            </Link>
            <Link href={`/employer/jobs/${job._id}/edit`} className="btn-ghost">
              <Pencil size={16} /> Засах
            </Link>
            {job.status !== 'closed' && <CloseJobButton id={job._id.toString()} />}
          </div>
        </div>
      </div>

      <h2 className="text-lg font-bold">Өргөдлүүд · {apps.length}</h2>
      {apps.length === 0 ? (
        <EmptyState icon={<Inbox size={22} />} title="Одоохондоо өргөдөл алга" />
      ) : (
        groups.map((g) => (
          <section key={g.label} className="space-y-2.5">
            <h3 className="text-sm font-semibold text-muted">
              {g.label} · {g.items.length}
            </h3>
            <ApplicantList items={g.items} />
          </section>
        ))
      )}
    </div>
  );
}
