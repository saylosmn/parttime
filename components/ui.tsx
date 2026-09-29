import Link from 'next/link';
import clsx from 'clsx';
import { Clock, Star, Zap, BadgeCheck } from 'lucide-react';
import { APP_NAME, APP_STATUS, LIMITS, formatPay, type AppStatus, type PayUnit } from '@/lib/config';

export function Logo({ sub, href = '/' }: { sub?: string; href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-accent text-accent-ink">
        <Clock size={20} strokeWidth={2.5} />
      </span>
      <span className="leading-tight">
        <span className="h-display block text-xl">{APP_NAME}</span>
        {sub && <span className="block text-xs text-muted">{sub}</span>}
      </span>
    </Link>
  );
}

export function initials(name: string) {
  const parts = name.replace(/[&-]/g, ' ').split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '')).toUpperCase();
}

export function Avatar({ name, size = 'md', className }: { name: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const s = size === 'lg' ? 'h-16 w-16 text-xl rounded-[18px]' : size === 'sm' ? 'h-10 w-10 text-sm rounded-xl' : 'h-12 w-12 text-base rounded-[14px]';
  return (
    <span className={clsx('flex shrink-0 items-center justify-center border border-green-line bg-green-bg font-display font-bold text-green-soft', s, className)}>
      {initials(name)}
    </span>
  );
}

export function Rating({ avg, count, showCount = true }: { avg: number; count: number; showCount?: boolean }) {
  if (count < LIMITS.minRatingsForAvg) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-star">
        <Star size={14} fill="currentColor" /> Шинэ
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Star size={14} className="text-star" fill="currentColor" />
      <span className="font-semibold text-star">{avg.toFixed(1)}</span>
      {showCount && <span className="text-muted">· {count} үнэлгээ</span>}
    </span>
  );
}

export function Pay({ amount, unit, size = 'md' }: { amount: number; unit: PayUnit; size?: 'md' | 'lg' | 'xl' }) {
  const [num, per] = formatPay(amount, unit).split('/');
  return (
    <span className="whitespace-nowrap">
      <span className={clsx('font-display font-bold text-accent', size === 'xl' ? 'text-3xl' : size === 'lg' ? 'text-2xl' : 'text-base')}>{num}</span>
      <span className="text-sm text-muted"> /{per}</span>
    </span>
  );
}

const STATUS_STYLE: Record<AppStatus, string> = {
  sent: 'bg-surface-2 text-soft',
  viewed: 'bg-surface-2 text-green-soft',
  invited: 'bg-accent text-accent-ink',
  hired: 'bg-accent text-accent-ink',
  completed: 'bg-green-bg text-green-soft border border-green-line',
  rejected: 'bg-[#2a1212] text-[#F26B6B]',
};

export function StatusBadge({ status }: { status: AppStatus }) {
  return <span className={clsx('badge', STATUS_STYLE[status])}>{APP_STATUS[status]}</span>;
}

export function UrgentBadge() {
  return (
    <span className="badge bg-urgent text-accent-ink">
      <Zap size={12} fill="currentColor" /> Яаралтай
    </span>
  );
}

export function Verified({ className }: { className?: string }) {
  return <BadgeCheck size={16} className={clsx('text-accent', className)} aria-label="Баталгаажсан" />;
}

export function EmptyState({ icon, title, body, action }: { icon: React.ReactNode; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-muted">{icon}</span>
      <p className="font-semibold">{title}</p>
      {body && <p className="max-w-xs text-sm text-muted">{body}</p>}
      {action}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="h-display mt-2 text-3xl">{value}</p>
      {hint && <p className="mt-2 text-sm text-accent">{hint}</p>}
    </div>
  );
}
