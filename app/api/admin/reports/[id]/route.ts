import { handle, ok, requireUser } from '@/lib/guards';
import { Report } from '@/models';

type Ctx = { params: { id: string } };

export const PATCH = handle(async (_req: Request, { params }: Ctx) => {
  await requireUser(['admin']);
  await Report.updateOne({ _id: params.id }, { resolved: true });
  return ok();
});
