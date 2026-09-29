import { handle, ok, requireUser, HttpError } from '@/lib/guards';
import { adminJobSchema } from '@/lib/validators';
import { Job, type JobT } from '@/models';
import { notify } from '@/lib/notify';
import { broadcastJob } from '@/lib/services';

type Ctx = { params: { id: string } };

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  await requireUser(['admin']);
  const input = adminJobSchema.parse(await req.json());
  const job = await Job.findById(params.id);
  if (!job) throw new HttpError(404, 'Зар олдсонгүй');

  switch (input.action) {
    case 'approve':
      job.status = 'active';
      job.rejectReason = undefined;
      await job.save();
      await notify(job.employerId, {
        type: 'job_approved',
        title: 'Таны зар нийтлэгдлээ',
        body: `«${job.title}»`,
        link: `/jobs/${job._id}`,
      });
      break;
    case 'reject':
      job.status = 'rejected';
      job.rejectReason = input.reason;
      await job.save();
      await notify(job.employerId, {
        type: 'job_rejected',
        title: 'Таны зар татгалзагдлаа',
        body: `«${job.title}»: ${input.reason}`,
        link: `/employer/jobs/${job._id}/edit`,
      });
      break;
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
  if (input.action === 'approve' || input.action === 'feature') {
    await broadcastJob(job.toObject() as JobT);
  }
  return ok();
});
