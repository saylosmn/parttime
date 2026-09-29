import { z } from 'zod';
import { handle, ok, requireUser } from '@/lib/guards';
import { Notification } from '@/models';

export const GET = handle(async () => {
  const me = await requireUser();
  const items = await Notification.find({ userId: me.id }).sort({ createdAt: -1 }).limit(50).lean();
  return ok({ items });
});

const markSchema = z.object({ id: z.string().optional(), all: z.boolean().optional() });

export const PATCH = handle(async (req: Request) => {
  const me = await requireUser();
  const { id, all } = markSchema.parse(await req.json());
  if (all) await Notification.updateMany({ userId: me.id, read: false }, { read: true });
  else if (id) await Notification.updateOne({ _id: id, userId: me.id }, { read: true });
  return ok();
});
