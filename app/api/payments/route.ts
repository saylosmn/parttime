import { z } from 'zod';
import { handle, ok, requireUser, HttpError } from '@/lib/guards';
import { Job, Payment } from '@/models';
import { getOrCreateOpenPayment } from '@/lib/payments';

const schema = z.object({ jobId: z.string().regex(/^[a-f0-9]{24}$/i, 'Зар сонгоно уу') });

/** Сонгосон зарын гүйлгээний утгыг авна (байхгүй бол үүсгэнэ). Админд мэдэгдэхгүй. */
export const POST = handle(async (req: Request) => {
  const me = await requireUser(['employer']);
  const { jobId } = schema.parse(await req.json());
  const job = await Job.findById(jobId, 'employerId status');
  if (!job || job.employerId.toString() !== me.id) throw new HttpError(404, 'Зар олдсонгүй');
  if (job.status !== 'active') throw new HttpError(400, 'Зөвхөн нийтлэгдсэн зарыг онцлох болгоно');
  const open = await Payment.countDocuments({ employerId: me.id, open: true });
  if (open >= 10) throw new HttpError(429, 'Нээлттэй төлбөр хэт олон байна. Хэрэггүйг нь цуцална уу.');
  const p = await getOrCreateOpenPayment(me.id, jobId);
  return ok({ id: p._id.toString(), code: p.code, amount: p.amount, status: p.status });
});
