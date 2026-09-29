import Link from 'next/link';
import { Avatar, Pay, UrgentBadge, Verified } from './ui';
import { PAY_PER, TAGS } from '@/lib/config';
import type { JobCard as JobCardT } from '@/lib/queries';

export function JobRow({ job }: { job: JobCardT }) {
  const tagText = job.tags.slice(0, 2).map((t) => TAGS[t]).join(', ');
  return (
    <Link href={`/jobs/${job._id}`} className="card flex items-center gap-3 p-4 transition-colors hover:bg-surface-2">
      <Avatar name={job.employer.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{job.title}</p>
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
          <span className="truncate">{job.employer.name}</span>
          {job.employer.verified && <Verified className="shrink-0" />}
          <span>· {job.district}</span>
          {tagText && <span className="truncate">· {tagText}</span>}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-display text-base font-bold text-accent">{job.payAmount.toLocaleString('en-US')}₮</p>
        <p className="text-xs text-muted">{PAY_PER[job.payUnit]}</p>
      </div>
    </Link>
  );
}

export function FeaturedCard({ job }: { job: JobCardT }) {
  return (
    <div className="card-green p-5">
      <div className="flex items-center justify-between">
        {job.isUrgent ? <UrgentBadge /> : <span className="badge bg-accent text-accent-ink">Онцлох</span>}
        <span className="text-xs text-muted">{job.schedule}</span>
      </div>
      <Link href={`/jobs/${job._id}`}>
        <p className="mt-4 text-lg font-bold">{job.title}</p>
        <p className="mt-1 text-sm text-green-soft">
          {job.employer.name} · {job.district}
        </p>
      </Link>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <Pay amount={job.payAmount} unit={job.payUnit} size="lg" />
        </div>
        <Link href={`/jobs/${job._id}`} className="btn-primary px-5">
          Өргөдөл
        </Link>
      </div>
    </div>
  );
}
