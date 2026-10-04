import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Eye, Inbox, Pencil } from 'lucide-react';
import { Types } from 'mongoose';
import { pageUser } from '@/lib/guards';
import { dbConnect } from '@/lib/db';
import { Job } from '@/models';
import { loadApplicants, markViewed, type ApplicantSort } from '@/lib/employer';
import clsx from 'clsx';
import { JobActions } from '@/components/employer/JobActions';
import { formatPay, type PayUnit } from '@/lib/config';
import { EmptyState } from '@/components/ui';
import { ApplicantList } from '@/components/employer/Applicants';
import { JobStatusBadge } from '@/components/employer/JobStatusBadge';
import { CloseJobButton } from '@/components/employer/CloseJobButton';

export const dynamic = 'force-dynamic';

export async function generateMetadata(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!Types.ObjectId.isValid(params.id)) return { title: 'Зар' };
  await dbConnect();
  const job = await Job.findById(params.id, 'title').lean();
  return { title: job ? `${job.title} · Өргөдлүүд` : 'Зар' };
}

export default async function EmployerJobPage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ sort?: string }> }) {
  const params = await props.params;
  const { sort: sortParam } = await props.searchParams;
  const sort: ApplicantSort = sortParam === 'rating' || sortParam === 'match' ? sortParam : 'new';
  const me = await pageUser(['employer']);
  if (!Types.ObjectId.isValid(params.id)) notFound();
  const job = await Job.findById(params.id).lean();
  if (!job || (job.employerId.toString() !== me.id && me.role !== 'admin')) notFound();

  const employerId = job.employerId.toString();
  // Админ харах үед оюутанд "харлаа" мэдэгдэл явуулахгүй
  if (employerId === me.id) await markViewed(employerId, params.id);
  const apps = await loadApplicants(employerId, { jobId: params.id }, 200, sort);
  const waiting = apps.filter((a) => ['sent', 'viewed', 'invited'].includes(a.status)).length;
  const expired = new Date(job.expiresAt) <= new Date();
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
            {job.status === 'active' && expired && <p className="mt-2 text-sm text-urgent">Хугацаа дууссан — «Дахин нийтлэх» дарж 30 хоног сунгана уу.</p>}
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
        <div className="mt-4 border-t border-line pt-4">
          <JobActions id={job._id.toString()} status={job.status} expired={expired} waiting={waiting} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Өргөдлүүд · {apps.length}</h2>
        {apps.length > 1 && (
          <div className="flex gap-1.5" role="group" aria-label="Эрэмбэлэх">
            {([
              ['new', 'Шинэ нь'],
              ['match', 'Тохирох нь'],
              ['rating', 'Үнэлгээгээр'],
            ] as const).map(([k, l]) => (
              <Link key={k} href={`?sort=${k}`} scroll={false} className={clsx('chip min-h-[36px]', sort === k && 'chip-active')}>
                {l}
              </Link>
            ))}
          </div>
        )}
      </div>
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
