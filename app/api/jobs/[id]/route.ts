import { handle, ok, requireUser, HttpError } from '@/lib/guards';
import { jobSchema } from '@/lib/validators';
import { Job, type JobT } from '@/models';
import { mapFields } from '@/lib/job-location';
import { moderateJob } from '@/lib/moderation';
import { publishOrReview } from '@/lib/job-admin';

type Ctx = { params: Promise<{ id: string }> };

async function ownJob(id: string, userId: string, role: string | null) {
  const job = await Job.findById(id);
  if (!job) throw new HttpError(404, 'Зар олдсонгүй');
  if (role !== 'admin' && job.employerId.toString() !== userId) throw new HttpError(403, 'Эрх хүрэхгүй байна');
  return job;
}

// Оюутнуудыг төөрөгдүүлж болох "чухал" талбарууд — эдгээр өөрчлөгдвөл дахин шалгана
const MAJOR = ['title', 'description', 'payAmount', 'payUnit', 'requirements'] as const;
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Зар засах. Нийтлэгдсэн зарын хуваарь, хаяг, газрын зураг, шошго зэрэг жижиг засвар →
 * зар харагдсаар байна. Чухал талбар өөрчлөгдвөл дахин шалгалтад (баталгаажсан бол шууд).
 */
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const params = await ctx.params;
  const me = await requireUser(['employer']);
  const job = await ownJob(params.id, me.id, me.role);
  const data = jobSchema.parse(await req.json());

  const majorChanged = MAJOR.some((k) => !same(job.get(k), (data as Record<string, unknown>)[k]));
  const wasActive = job.status === 'active';
  Object.assign(job, data, await mapFields(data.mapUrl), moderateJob(data));

  if (me.role === 'admin' || (wasActive && !majorChanged && !job.flagged)) {
    await job.save();
    return ok({ status: job.status, review: false });
  }
  job.status = 'pending';
  await job.save();
  const result = await publishOrReview(job.toObject() as JobT, true);
  return ok({ status: result === 'published' ? 'active' : 'pending', review: result === 'pending' });
});

// Ажил олгогч зараа хаах
export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  const params = await ctx.params;
  const me = await requireUser(['employer']);
  const job = await ownJob(params.id, me.id, me.role);
  job.status = 'closed';
  await job.save();
  return ok();
});
