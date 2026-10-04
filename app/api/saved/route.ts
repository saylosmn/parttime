import { z } from 'zod';
import { handle, ok, requireUser, HttpError } from '@/lib/guards';
import { Job, User } from '@/models';

const schema = z.object({ jobId: z.string().regex(/^[a-f0-9]{24}$/i), saved: z.boolean() });

/** Оюутан зар хадгалах / хадгалснаас хасах. */
export const POST = handle(async (req: Request) => {
  const me = await requireUser(['student']);
  const { jobId, saved } = schema.parse(await req.json());
  if (saved) {
    if (!(await Job.exists({ _id: jobId }))) throw new HttpError(404, 'Зар олдсонгүй');
    const user = await User.findById(me.id, 'savedJobs').lean();
    if ((user?.savedJobs?.length ?? 0) >= 100) throw new HttpError(400, '100-аас олон зар хадгалах боломжгүй');
    await User.updateOne({ _id: me.id }, { $addToSet: { savedJobs: jobId } });
  } else {
    await User.updateOne({ _id: me.id }, { $pull: { savedJobs: jobId } });
  }
  return ok({ saved });
});
