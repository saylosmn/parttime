import { handle, ok, requireUser, HttpError } from '@/lib/guards';
import { jobSchema } from '@/lib/validators';
import { Job, type JobT } from '@/models';
import { mapFields } from '@/lib/job-location';
import { moderateJob } from '@/lib/moderation';
import { notifyJobPending } from '@/lib/job-admin';

type Ctx = { params: { id: string } };

async function ownJob(id: string, userId: string, role: string | null) {
  const job = await Job.findById(id);
  if (!job) throw new HttpError(404, 'Зар олдсонгүй');
  if (role !== 'admin' && job.employerId.toString() !== userId) throw new HttpError(403, 'Эрх хүрэхгүй байна');
  return job;
}

// Засвар хийхэд дахин админ шалгалтад орно.
export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const me = await requireUser(['employer']);
  const job = await ownJob(params.id, me.id, me.role);
  const data = jobSchema.parse(await req.json());
  Object.assign(job, data, await mapFields(data.mapUrl), moderateJob(data));
  const needsReview = me.role !== 'admin';
  if (needsReview) job.status = 'pending';
  await job.save();
  if (needsReview) await notifyJobPending(job.toObject() as JobT, true);
  return ok();
});

// Ажил олгогч зараа хаах
export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const me = await requireUser(['employer']);
  const job = await ownJob(params.id, me.id, me.role);
  job.status = 'closed';
  await job.save();
  return ok();
});
