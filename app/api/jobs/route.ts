import { handle, ok, requireUser, HttpError, startOfDay } from '@/lib/guards';
import { jobSchema } from '@/lib/validators';
import { Job, type JobT } from '@/models';
import { LIMITS } from '@/lib/config';
import { moderateJob } from '@/lib/moderation';
import { notifyJobPending } from '@/lib/job-admin';
import { searchJobs } from '@/lib/queries';
import { dbConnect } from '@/lib/db';
import { mapFields } from '@/lib/job-location';

export const GET = handle(async (req: Request) => {
  await dbConnect();
  const sp = new URL(req.url).searchParams;
  const jobs = await searchJobs(Object.fromEntries(sp.entries()));
  return ok({ jobs });
});

export const POST = handle(async (req: Request) => {
  const me = await requireUser(['employer']);
  const today = await Job.countDocuments({ employerId: me.id, createdAt: { $gte: startOfDay() } });
  if (today >= LIMITS.jobsPerDay) throw new HttpError(429, `Өдөрт ${LIMITS.jobsPerDay}-аас олон зар нэмэх боломжгүй`);
  const data = jobSchema.parse(await req.json());
  const job = await Job.create({
    ...data,
    ...(await mapFields(data.mapUrl)),
    ...moderateJob(data),
    employerId: me.id,
    status: 'pending',
    expiresAt: new Date(Date.now() + LIMITS.jobLifetimeDays * 86400_000),
  });
  await notifyJobPending(job.toObject() as JobT);
  return ok({ id: job._id.toString() }, 201);
});
