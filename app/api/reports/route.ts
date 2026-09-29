import { handle, ok, requireUser, HttpError } from '@/lib/guards';
import { reportSchema } from '@/lib/validators';
import { Job, Report } from '@/models';
import { notifyAdmins } from '@/lib/notify';

export const POST = handle(async (req: Request) => {
  const me = await requireUser();
  const { jobId, reason } = reportSchema.parse(await req.json());
  const job = await Job.findById(jobId, 'title');
  if (!job) throw new HttpError(404, 'Зар олдсонгүй');
  const dup = await Report.exists({ jobId, reporterId: me.id, resolved: false });
  if (dup) throw new HttpError(409, 'Та энэ зарын талаар гомдол илгээсэн байна');
  await Report.create({ jobId, reporterId: me.id, reason });
  await notifyAdmins({ type: 'report_new', title: 'Шинэ гомдол', body: `«${job.title}»: ${reason}`, link: '/admin/reports' });
  return ok({}, 201);
});
