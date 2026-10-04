import Link from 'next/link';
import clsx from 'clsx';
import { Bell, Briefcase, CalendarDays, MessageCircle, Check, ChevronLeft, FileText, MapPin, Star, X, AlertTriangle, Megaphone } from 'lucide-react';
import { pageUser } from '@/lib/guards';
import { Application, Notification, Review } from '@/models';
import { timeAgo } from '@/lib/config';
import { EmptyState } from '@/components/ui';
import { PushPrompt } from '@/components/Pwa';
import { InviteActions, MarkAllRead } from '@/components/NotificationActions';
import { ReviewForm } from '@/components/ReviewForm';

export const metadata = { title: 'Мэдэгдэл' };
export const dynamic = 'force-dynamic';

const ICONS: Record<string, React.ElementType> = {
  interview_invite: CalendarDays,
  application_viewed: Check,
  application_new: FileText,
  application_rejected: X,
  application_hired: Check,
  job_nearby: MapPin,
  job_new: Briefcase,
  message_new: MessageCircle,
  interview_reminder: CalendarDays,
  review_request: Star,
  job_expiring: AlertTriangle,
  low_rating: AlertTriangle,
  job_approved: Megaphone,
  job_rejected: X,
};

function bucket(d: Date) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (d >= start) return 'Өнөөдөр';
  if (d >= new Date(start.getTime() - 86400_000)) return 'Өчигдөр';
  return 'Өмнө';
}

export default async function NotificationsPage() {
  const me = await pageUser();
  const items = await Notification.find({ userId: me.id }).sort({ createdAt: -1 }).limit(60).lean();

  const appIds = items.map((n) => (n.meta as { applicationId?: string })?.applicationId).filter(Boolean) as string[];
  const [apps, reviews] = await Promise.all([
    Application.find({ _id: { $in: appIds } }, 'status interviewResponse').lean(),
    Review.find({ applicationId: { $in: appIds }, fromUserId: me.id }, 'applicationId').lean(),
  ]);
  const appMap = new Map(apps.map((a) => [a._id.toString(), a]));
  const reviewed = new Set(reviews.map((r) => r.applicationId.toString()));
  const unread = items.filter((n) => !n.read).length;

  const groups = new Map<string, typeof items>();
  for (const n of items) {
    const k = bucket(new Date(n.createdAt));
    groups.set(k, [...(groups.get(k) ?? []), n]);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href={me.role === 'employer' ? '/employer' : '/'} className="icon-btn" aria-label="Буцах">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="h-display flex-1 text-2xl">Мэдэгдэл</h1>
        {unread > 0 && <MarkAllRead />}
      </div>

      <PushPrompt force />

      {items.length === 0 ? (
        <EmptyState icon={<Bell size={22} />} title="Мэдэгдэл алга" body="Өргөдөл, урилга, хариу ирэхэд энд харагдана." />
      ) : (
        [...groups.entries()].map(([label, list]) => (
          <section key={label} className="space-y-3">
            <h2 className="text-sm font-semibold text-muted">{label}</h2>
            {list.map((n) => {
              const Icon = ICONS[n.type] ?? Bell;
              const appId = (n.meta as { applicationId?: string })?.applicationId;
              const app = appId ? appMap.get(appId) : undefined;
              const canAnswerInvite = n.type === 'interview_invite' && app?.status === 'invited' && !app.interviewResponse && me.role === 'student';
              const canReview = n.type === 'review_request' && app?.status === 'completed' && appId && !reviewed.has(appId);
              const highlight = canAnswerInvite || !n.read;
              return (
                <div key={n._id.toString()} className={clsx('p-4', highlight && n.type === 'interview_invite' ? 'card-green' : 'card', !n.read && 'border-green-line')}>
                  <div className="flex gap-3">
                    <span className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', n.type === 'interview_invite' ? 'bg-accent text-accent-ink' : n.type === 'review_request' ? 'bg-[#2a2410] text-star' : 'bg-surface-2 text-accent')}>
                      <Icon size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={n.link} className="font-bold leading-snug">
                          {n.title}
                        </Link>
                        <span className="shrink-0 text-xs text-muted">{timeAgo(n.createdAt)}</span>
                      </div>
                      {n.body && <p className="mt-1 text-sm text-soft">{n.body}</p>}
                      {canAnswerInvite && appId && <InviteActions applicationId={appId} />}
                      {canReview && appId && (
                        <div className="mt-3">
                          <ReviewForm applicationId={appId} direction={me.role === 'employer' ? 'employer_to_student' : 'student_to_employer'} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        ))
      )}
    </div>
  );
}
