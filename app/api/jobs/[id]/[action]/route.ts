import { handle, ok, requireUser, HttpError } from '@/lib/guards';
import { Application, Job, User, type JobT } from '@/models';
import { LIMITS } from '@/lib/config';
import { notifyMany } from '@/lib/notify';
import { publishOrReview } from '@/lib/job-admin';

type Ctx = { params: Promise<{ id: string; action: string }> };
export const maxDuration = 60;

/**
 * Ажил олгогчийн хурдан үйлдлүүд:
 *  - fill:   "Ажилтан олдсон" → зарыг хааж, хариу хүлээж буй бүх өргөдөлд эелдэг хариу автоматаар илгээнэ
 *  - repost: хаагдсан / хугацаа дууссан зарыг дахин 30 хоног нийтлэх
 */
export const POST = handle(async (_req: Request, ctx: Ctx) => {
  const { id, action } = await ctx.params;
  const me = await requireUser(['employer']);
  const job = await Job.findById(id);
  if (!job) throw new HttpError(404, 'Зар олдсонгүй');
  if (me.role !== 'admin' && job.employerId.toString() !== me.id) throw new HttpError(403, 'Эрх хүрэхгүй байна');

  if (action === 'fill') {
    const employer = await User.findById(job.employerId, 'companyName name').lean();
    const company = employer?.companyName || employer?.name || 'Ажил олгогч';
    const waiting = await Application.find({ jobId: job._id, status: { $in: ['sent', 'viewed', 'invited'] } }, 'studentId').lean();
    await Application.updateMany({ _id: { $in: waiting.map((a) => a._id) } }, { status: 'rejected' });
    job.status = 'closed';
    await job.save();
    await notifyMany(
      waiting.map((a) => a.studentId),
      {
        type: 'application_rejected',
        title: `«${job.title}» ажилд хүн олдлоо`,
        body: `${company} энэ удаа өөр хүн сонгосон байна. Өргөдөл илгээсэнд баярлалаа — бусад шинэ заруудаас үзээрэй.`,
        link: '/',
      },
    );
    return ok({ rejected: waiting.length });
  }

  if (action === 'repost') {
    if (job.status === 'pending') throw new HttpError(400, 'Зар шалгагдаж байна');
    const expired = job.expiresAt <= new Date();
    if (job.status === 'active' && !expired) throw new HttpError(400, 'Зар идэвхтэй байна');
    job.expiresAt = new Date(Date.now() + LIMITS.jobLifetimeDays * 86400_000);
    job.expiryWarned = false;
    job.status = 'pending';
    await job.save();
    const result = await publishOrReview(job.toObject() as JobT, true);
    return ok({ status: result === 'published' ? 'active' : 'pending' });
  }

  throw new HttpError(404, 'Үйлдэл олдсонгүй');
});
