import { handle, ok, requireUser, HttpError } from '@/lib/guards';
import { adminJobSchema } from '@/lib/validators';
import { Job, type JobT } from '@/models';
import { broadcastJob } from '@/lib/services';
import { approveJob, rejectJob } from '@/lib/job-admin';

type Ctx = { params: Promise<{ id: string }> };

// Зар зөвшөөрөхөд бүх оюутанд мэдэгдэл илгээдэг тул хугацааг сунгана
export const maxDuration = 60;

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const params = await ctx.params;
  await requireUser(['admin']);
  const input = adminJobSchema.parse(await req.json());
  const job = await Job.findById(params.id);
  if (!job) throw new HttpError(404, 'Зар олдсонгүй');

  switch (input.action) {
    case 'approve':
      if (!(await approveJob(params.id))) throw new HttpError(409, 'Зар аль хэдийн шийдвэрлэгдсэн байна');
      return ok();
    case 'reject':
      if (!(await rejectJob(params.id, input.reason))) throw new HttpError(409, 'Зар аль хэдийн шийдвэрлэгдсэн байна');
      return ok();
    case 'feature':
      // Одоохондоо төлбөрийг дансаар хүлээн авч админ гараар идэвхжүүлнэ (дараа нь QPay webhook).
      job.isFeatured = true;
      job.featuredUntil = new Date(Date.now() + input.days * 86400_000);
      await job.save();
      break;
    case 'unfeature':
      job.isFeatured = false;
      job.featuredUntil = undefined;
      await job.save();
      break;
    case 'close':
      job.status = 'closed';
      await job.save();
      break;
  }
  if (input.action === 'feature') await broadcastJob(job.toObject() as JobT);
  return ok();
});
