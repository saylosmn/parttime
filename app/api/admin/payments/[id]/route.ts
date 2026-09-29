import { z } from 'zod';
import { handle, ok, requireUser, HttpError } from '@/lib/guards';
import { Job, Payment, type JobT } from '@/models';
import { notify } from '@/lib/notify';
import { broadcastJob } from '@/lib/services';
import { sendTelegram } from '@/lib/telegram';

type Ctx = { params: { id: string } };
export const maxDuration = 60;

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('confirm') }),
  z.object({ action: z.literal('reject'), note: z.string().trim().min(3, 'Шалтгаан бичнэ үү').max(200) }),
]);

/** Админ дансаа шалгаад баталгаажуулна → зар автоматаар онцлох болно. */
export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  await requireUser(['admin']);
  const input = schema.parse(await req.json());
  // Давхар баталгаажуулахаас сэргийлж зөвхөн pending төлөвөөс атомаар шилжүүлнэ
  const payment = await Payment.findOneAndUpdate(
    { _id: params.id, status: 'pending' },
    input.action === 'confirm' ? { status: 'confirmed' } : { status: 'rejected', note: input.note },
    { new: true },
  );
  if (!payment) throw new HttpError(409, 'Төлбөр олдсонгүй эсвэл аль хэдийн шийдвэрлэгдсэн');
  const job = await Job.findById(payment.jobId);

  if (input.action === 'confirm') {
    if (job) {
      // Онцлох хугацаа идэвхтэй бол үргэлжлүүлж сунгана
      const base = job.isFeatured && job.featuredUntil && job.featuredUntil > new Date() ? job.featuredUntil.getTime() : Date.now();
      job.isFeatured = true;
      job.featuredUntil = new Date(base + payment.days * 86400_000);
      await job.save();
      await broadcastJob(job.toObject() as JobT);
    }
    await notify(payment.employerId, {
      type: 'payment_confirmed',
      title: `Төлбөр баталгаажлаа — «${job?.title ?? 'зар'}» онцлох боллоо`,
      body: `${payment.amount.toLocaleString('en-US')}₮ (гүйлгээний утга ${payment.code}) хүлээн авлаа. Зар тань ${payment.days} хоног жагсаалтын дээд хэсэгт харагдана.`,
      link: '/employer/billing',
    });
    await sendTelegram(`✅ Төлбөр ${payment.code} баталгаажлаа — «${job?.title ?? ''}» онцлох боллоо.`);
  } else {
    await notify(payment.employerId, {
      type: 'payment_rejected',
      title: `Төлбөр баталгаажсангүй (гүйлгээний утга ${payment.code})`,
      body: `Шалтгаан: ${input.note}. Асуух зүйл байвал Telegram-аар холбогдоно уу.`,
      link: '/employer/billing',
    });
  }
  return ok();
});
