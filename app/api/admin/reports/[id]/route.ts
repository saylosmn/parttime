import { handle, ok, requireUser } from '@/lib/guards';
import { Report } from '@/models';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handle(async (_req: Request, ctx: Ctx) => {
  const params = await ctx.params;
  await requireUser(['admin']);
  await Report.updateOne({ _id: params.id }, { resolved: true });
  return ok();
});
