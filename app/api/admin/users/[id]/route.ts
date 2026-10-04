import { z } from 'zod';
import { handle, ok, requireUser, HttpError } from '@/lib/guards';
import { User } from '@/models';

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({ verified: z.boolean().optional(), banned: z.boolean().optional() });

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const params = await ctx.params;
  const me = await requireUser(['admin']);
  if (params.id === me.id) throw new HttpError(400, 'Өөрийгөө өөрчлөх боломжгүй');
  const data = schema.parse(await req.json());
  await User.updateOne({ _id: params.id }, data);
  return ok();
});
