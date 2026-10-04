import Link from 'next/link';
import clsx from 'clsx';
import { CalendarDays, FileText, MessageCircle } from 'lucide-react';
import { pageUser } from '@/lib/guards';
import { Application, Review } from '@/models';
import { formatDateTime, timeAgo, type AppStatus } from '@/lib/config';
import { Avatar, EmptyState, StatusBadge } from '@/components/ui';
import { PushPrompt } from '@/components/Pwa';
import { ReviewForm } from '@/components/ReviewForm';
import { InviteActions } from '@/components/NotificationActions';

export const metadata = { title: 'Миний өргөдлүүд' };
export const dynamic = 'force-dynamic';

const STEPS: AppStatus[] = ['sent', 'viewed', 'invited', 'hired'];
const STEP_LABEL = ['Илгээсэн', 'Үзсэн', 'Урьсан', 'Ажилд орсон'];

export default async function MyApplications(props: { searchParams: Promise<{ tab?: string }> }) {
  const searchParams = await props.searchParams;
  const me = await pageUser(['student']);
  const tab = searchParams.tab === 'done' ? 'done' : 'active';
  const all = await Application.find({ studentId: me.id })
    .sort({ updatedAt: -1 })
    .populate('jobId', 'title schedule')
    .populate('employerId', 'name companyName')
    .lean();
  const doneStatuses = ['completed', 'rejected'];
  const active = all.filter((a) => !doneStatuses.includes(a.status));
  const done = all.filter((a) => doneStatuses.includes(a.status));
  const list = tab === 'done' ? done : active;
  const reviewed = new Set(
    (await Review.find({ fromUserId: me.id, applicationId: { $in: done.map((a) => a._id) } }, 'applicationId').lean()).map((r) => r.applicationId.toString()),
  );

  return (
    <div className="space-y-5">
      <h1 className="h-display text-2xl">Миний өргөдлүүд</h1>
      <PushPrompt />
      <div className="grid grid-cols-2 gap-1 rounded-card border border-line bg-surface p-1">
        <Link href="/me/applications" className={clsx('flex min-h-[44px] items-center justify-center rounded-btn text-sm font-semibold', tab === 'active' ? 'bg-surface-2 text-text' : 'text-muted')}>
          Идэвхтэй · {active.length}
        </Link>
        <Link href="/me/applications?tab=done" className={clsx('flex min-h-[44px] items-center justify-center rounded-btn text-sm font-semibold', tab === 'done' ? 'bg-surface-2 text-text' : 'text-muted')}>
          Дууссан · {done.length}
        </Link>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<FileText size={22} />}
          title={tab === 'done' ? 'Дууссан өргөдөл алга' : 'Өргөдөл илгээгээгүй байна'}
          body="Өөрт тохирох ажлаа олоод нэг товчоор өргөдөл илгээгээрэй."
          action={
            <Link href="/" className="btn-primary">
              Ажил хайх
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {list.map((a) => {
            const job = a.jobId as any;
            const emp = a.employerId as any;
            const empName = emp?.companyName || emp?.name || 'Ажил олгогч';
            const stepIdx = STEPS.indexOf(a.status as AppStatus);
            const highlight = a.status === 'invited' || a.status === 'hired';
            return (
              <div key={a._id.toString()} className={clsx('p-4', highlight ? 'card-green' : 'card')}>
                <div className="flex items-center gap-3">
                  <Avatar name={empName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <Link href={job ? `/jobs/${job._id}` : '#'} className="block truncate font-bold">
                      {job?.title ?? 'Устгагдсан зар'}
                    </Link>
                    <p className="truncate text-xs text-muted">
                      {empName} · {timeAgo(a.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={a.status as AppStatus} />
                </div>

                {stepIdx >= 0 && (
                  <div className="mt-4">
                    <div className="grid grid-cols-4 gap-1.5">
                      {STEPS.map((s, i) => (
                        <span key={s} className={clsx('h-1 rounded-full', i <= stepIdx ? 'bg-accent' : 'bg-line')} />
                      ))}
                    </div>
                    <div className="mt-1.5 grid grid-cols-4 gap-1.5 text-[11px]">
                      {STEP_LABEL.map((l, i) => (
                        <span key={l} className={i === stepIdx ? 'font-bold text-text' : 'text-muted'}>
                          {l}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {a.status === 'invited' && a.interviewAt && (
                  <div className="mt-3 flex min-h-[48px] items-center gap-3 rounded-btn border border-line bg-sunken px-4">
                    <CalendarDays size={18} className="text-accent" />
                    <span className="flex-1 text-sm font-semibold">Ярилцлага: {formatDateTime(a.interviewAt)}</span>
                    {a.interviewResponse === 'accepted' ? (
                      <span className="text-xs font-semibold text-green-soft">Зөвшөөрсөн</span>
                    ) : a.interviewResponse === 'reschedule' ? (
                      <span className="text-xs font-semibold text-urgent">Цаг солих хүсэлт</span>
                    ) : (
<span className="text-xs font-semibold text-urgent">Хариу хүлээж байна</span>
                    )}
                  </div>
                )}

                {a.status === 'invited' && !a.interviewResponse && <InviteActions applicationId={a._id.toString()} />}

                {['invited', 'hired', 'completed'].includes(a.status) && (
                  <Link href={`/chat/${a._id}`} className="btn-ghost mt-3 w-full">
                    <MessageCircle size={16} /> Ажил олгогчтой чатлах
                  </Link>
                )}

                {a.status === 'completed' && !reviewed.has(a._id.toString()) && (
                  <div className="mt-4 border-t border-line pt-4">
                    <ReviewForm applicationId={a._id.toString()} direction="student_to_employer" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
