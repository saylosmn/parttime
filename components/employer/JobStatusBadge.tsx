import clsx from 'clsx';
import { JOB_STATUS } from '@/lib/config';

const STYLE: Record<string, string> = {
  active: 'bg-green-bg text-green-soft border border-green-line',
  pending: 'bg-[#2a1f08] text-urgent',
  rejected: 'bg-[#2a1212] text-[#F26B6B]',
  closed: 'bg-surface-2 text-muted',
};

export function JobStatusBadge({ status }: { status: string }) {
  return <span className={clsx('badge shrink-0', STYLE[status])}>{JOB_STATUS[status as keyof typeof JOB_STATUS] ?? status}</span>;
}
