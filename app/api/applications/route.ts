import { handle, ok, requireUser, HttpError, startOfDay } from '@/lib/guards';
import { applySchema } from '@/lib/validators';
import { Application, Job, User } from '@/models';
import { LIMITS } from '@/lib/config';
import { notify } from '@/lib/notify';

export const POST = handle(async (req: Request) => {
  const me = await requireUser(['student']);
  const { jobId, message } = applySchema.parse(await req.json());

  const today = await Application.countDocuments({ studentId: me.id, createdAt: { $gte: startOfDay() } });
  if (today >= LIMITS.applicationsPerDay) {
    throw new HttpError(429, `Өдөрт ${LIMITS.applicationsPerDay}-оос олон өргөдөл илгээх боломжгүй`);
  }
  const job = await Job.findById(jobId);
  if (!job || job.status !== 'active' || job.expiresAt < new Date()) throw new HttpError(404, 'Зар идэвхгүй байна');
  if (job.employerId.toString() === me.id) throw new HttpError(400, 'Өөрийн зард өргөдөл илгээх боломжгүй');

  const exists = await Application.exists({ jobId, studentId: me.id });
  if (exists) throw new HttpError(409, 'Та энэ зард өргөдөл илгээсэн байна');

  const app = await Application.create({ jobId, studentId: me.id, employerId: job.employerId, message });
  // "Цагт нэг удаа" тохиргоотой бол сүүлийн push-аас хойш 1 цаг болоогүй үед зөвхөн апп доторх мэдэгдэл
  const hourAgo = new Date(Date.now() - 3600_000);
  const pushAllowed = await User.findOneAndUpdate(
    {
      _id: job.employerId,
      $or: [{ appAlerts: { $ne: 'hourly' } }, { lastAppPushAt: { $exists: false } }, { lastAppPushAt: { $lt: hourAgo } }],
    },
    { lastAppPushAt: new Date() },
  );
  await notify(job.employerId, {
    type: 'application_new',
    title: `«${job.title}» зард шинэ өргөдөл ирлээ`,
    body: `${me.name ?? 'Оюутан'} өргөдөл илгээлээ. Профайлыг нь хараад «Урих» эсвэл «Татгалзах»-ыг сонгоно уу.`,
    link: `/employer/jobs/${job._id}`,
  }, { push: Boolean(pushAllowed) });
  return ok({ id: app._id.toString() }, 201);
});
