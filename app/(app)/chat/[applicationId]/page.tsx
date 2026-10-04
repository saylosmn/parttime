import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Lock, Phone } from 'lucide-react';
import { pageUser } from '@/lib/guards';
import { Job, Message, Notification, User } from '@/models';
import { chatAccess } from '@/lib/chat';
import { Avatar } from '@/components/ui';
import { ChatView } from '@/components/ChatView';

export const metadata = { title: 'Чат' };
export const dynamic = 'force-dynamic';

export default async function ChatPage(props: { params: Promise<{ applicationId: string }> }) {
  const params = await props.params;
  const me = await pageUser(['student', 'employer']);
  const access = await chatAccess(params.applicationId, me.id);
  if (!access) notFound();

  const [other, job, messages] = await Promise.all([
    User.findById(access.otherId, 'name companyName phone').lean(),
    Job.findById(access.app.jobId, 'title').lean(),
    Message.find({ applicationId: access.app._id }).sort({ createdAt: 1 }).limit(500).lean(),
  ]);
  // Нээхэд уншсан болгоно (мессеж болон холбогдох мэдэгдэл)
  await Promise.all([
    Message.updateMany({ applicationId: access.app._id, toUserId: me.id, read: false }, { read: true }),
    Notification.updateMany({ userId: me.id, type: 'message_new', link: `/chat/${access.app._id}`, read: false }, { read: true }),
  ]);

  const otherName = (access.side === 'student' ? other?.companyName || other?.name : other?.name) ?? 'Хэрэглэгч';
  const back = access.side === 'student' ? '/me/applications' : `/employer/jobs/${access.app.jobId}`;
  // Утасны дугаар: урьсны дараа л ажил олгогчид оюутных харагддаг дүрэм хэвээр
  const phone = access.open ? other?.phone : undefined;

  return (
    <div className="flex h-[calc(100dvh-84px-1rem-env(safe-area-inset-bottom))] flex-col">
      <header className="flex items-center gap-3 border-b border-line pb-3">
        <Link href={back} className="icon-btn" aria-label="Буцах">
          <ChevronLeft size={20} />
        </Link>
        <Avatar name={otherName} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{otherName}</p>
          <p className="truncate text-xs text-muted">«{job?.title ?? 'Зар'}»</p>
        </div>
        {phone && (
          <a href={`tel:+976${phone.replace(/\s/g, '')}`} className="icon-btn" aria-label="Залгах">
            <Phone size={18} />
          </a>
        )}
      </header>

      {access.open ? (
        <ChatView
          applicationId={access.app._id.toString()}
          meId={me.id}
          messages={messages.map((m) => ({
            id: m._id.toString(),
            mine: m.fromUserId.toString() === me.id,
            text: m.text,
            at: new Date(m.createdAt).toISOString(),
            read: m.read,
          }))}
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <Lock size={22} className="text-muted" />
          <p className="max-w-xs text-sm text-muted">Чат ажил олгогч ярилцлагад урьсны дараа нээгдэнэ.</p>
        </div>
      )}
    </div>
  );
}
