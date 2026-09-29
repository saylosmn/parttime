import { handle, ok, requireUser, HttpError, startOfDay } from '@/lib/guards';
import { jobSchema } from '@/lib/validators';
import { Job } from '@/models';
import { LIMITS } from '@/lib/config';
import { notifyAdmins } from '@/lib/notify';
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
    employerId: me.id,
    status: 'pending',
    expiresAt: new Date(Date.now() + LIMITS.jobLifetimeDays * 86400_000),
  });
  await notifyAdmins({
    type: 'job_pending',
    title: `Шалгах шинэ зар: «${job.title}»`,
    body: 'Ажил олгогч шинэ зар илгээлээ. Зөвшөөрөх эсвэл шалтгаантай татгалзана уу.',
    link: '/admin',
  });
  return ok({ id: job._id.toString() }, 201);
});
