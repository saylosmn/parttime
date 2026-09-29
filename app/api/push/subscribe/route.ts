import { z } from 'zod';
import { handle, ok, requireUser } from '@/lib/guards';
import { pushSubSchema } from '@/lib/validators';
import { PushSubscription } from '@/models';

export const POST = handle(async (req: Request) => {
  const me = await requireUser();
  const sub = pushSubSchema.parse(await req.json());
  await PushSubscription.updateOne(
    { endpoint: sub.endpoint },
    { $set: { userId: me.id, keys: sub.keys }, $setOnInsert: { endpoint: sub.endpoint } },
    { upsert: true },
  );
  return ok();
});

export const DELETE = handle(async (req: Request) => {
  const me = await requireUser();
  const { endpoint } = z.object({ endpoint: z.string().url() }).parse(await req.json());
  await PushSubscription.deleteOne({ endpoint, userId: me.id });
  return ok();
});
