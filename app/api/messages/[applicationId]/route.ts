import { z } from 'zod';
import { handle, ok, requireUser, HttpError, startOfDay } from '@/lib/guards';
import { Application, Job, Message, User } from '@/models';
import { chatAccess } from '@/lib/chat';
import { notify } from '@/lib/notify';

type Ctx = { params: Promise<{ applicationId: string }> };
const schema = z.object({ text: z.string().trim().min(1, 'Мессеж хоосон байна').max(1000, '1000 тэмдэгтээс хэтрэхгүй') });

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const params = await ctx.params;
  const me = await requireUser(['student', 'employer']);
  const access = await chatAccess(params.applicationId, me.id);
  if (!access) throw new HttpError(404, 'Чат олдсонгүй');
  if (!access.open) throw new HttpError(403, 'Чат зөвхөн ярилцлагад урьсны дараа нээгдэнэ');
  const { text } = schema.parse(await req.json());

  const today = await Message.countDocuments({ fromUserId: me.id, createdAt: { $gte: startOfDay() } });
  if (today >= 300) throw new HttpError(429, 'Өнөөдрийн мессежийн хязгаарт хүрлээ');

  const msg = await Message.create({ applicationId: access.app._id, fromUserId: me.id, toUserId: access.otherId, text });
  await Application.updateOne({ _id: access.app._id }, { lastMessageAt: msg.createdAt });

  const [sender, job] = await Promise.all([
    User.findById(me.id, 'name companyName').lean(),
    Job.findById(access.app.jobId, 'title').lean(),
  ]);
  const senderName = access.side === 'employer' ? sender?.companyName || sender?.name : sender?.name;
  await notify(access.otherId, {
    type: 'message_new',
    title: `${senderName ?? 'Шинэ'} мессеж илгээлээ · «${job?.title ?? ''}»`,
    body: text.length > 120 ? `${text.slice(0, 120)}…` : text,
    link: `/chat/${access.app._id}`,
  });
  return ok({ id: msg._id.toString() }, 201);
});

/** Уншсан болгох. */
export const PATCH = handle(async (_req: Request, ctx: Ctx) => {
  const params = await ctx.params;
  const me = await requireUser(['student', 'employer']);
  const access = await chatAccess(params.applicationId, me.id);
  if (!access) throw new HttpError(404, 'Чат олдсонгүй');
  await Message.updateMany({ applicationId: access.app._id, toUserId: me.id, read: false }, { read: true });
  return ok();
});
