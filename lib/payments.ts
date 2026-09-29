import { randomInt } from 'node:crypto';
import { Job, Payment, type JobT } from '@/models';
import { FEATURE_PRICE } from './config';
import { notify } from './notify';
import { broadcastJob } from './services';

export type DecideResult =
  | { ok: true; code: string; jobTitle: string; action: 'confirm' | 'reject' }
  | { ok: false; reason: 'not_found' };

/**
 * Хүлээгдэж буй төлбөрийг баталгаажуулах/татгалзах. Админ хуудас болон Telegram товч хоёулаа үүнийг ашиглана.
 * Зөвхөн pending төлөвөөс атомаар шилжүүлдэг тул давхар дарахад нэг л удаа биелнэ.
 */
export async function decidePayment(id: string, action: 'confirm' | 'reject', note?: string): Promise<DecideResult> {
  const payment = await Payment.findOneAndUpdate(
    { _id: id, status: 'pending' },
    action === 'confirm' ? { status: 'confirmed', open: false } : { status: 'rejected', open: false, note },
    { new: true },
  );
  if (!payment) return { ok: false, reason: 'not_found' };
  const job = await Job.findById(payment.jobId);

  if (action === 'confirm') {
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
  } else {
    await notify(payment.employerId, {
      type: 'payment_rejected',
      title: `Төлбөр баталгаажсангүй (гүйлгээний утга ${payment.code})`,
      body: `Шалтгаан: ${note ?? 'Гүйлгээ олдсонгүй'}. Асуух зүйл байвал бидэнтэй холбогдоно уу.`,
      link: '/employer/billing',
    });
  }
  return { ok: true, code: payment.code, jobTitle: job?.title ?? '', action };
}

/**
 * Тухайн зарын нээлттэй төлбөрийг буцаана, байхгүй бол санамсаргүй 4 оронтой
 * гүйлгээний утгатай шинээр үүсгэнэ. (Админд мэдэгдэхгүй — "шилжүүлсэн" дарахад л мэдэгдэнэ.)
 */
export async function getOrCreateOpenPayment(employerId: string, jobId: string) {
  const existing = await Payment.findOne({ jobId, employerId, open: true }).lean();
  if (existing) return existing;
  for (let i = 0; i < 10; i++) {
    const code = String(randomInt(1000, 10000));
    try {
      const p = await Payment.create({ employerId, jobId, code, amount: FEATURE_PRICE.amount, days: FEATURE_PRICE.days });
      return p.toObject();
    } catch (e) {
      if ((e as { code?: number }).code !== 11000) throw e;
      // Зэрэг хүсэлтээс болж тухайн зарт аль хэдийн үүссэн бол түүнийг буцаана
      const again = await Payment.findOne({ jobId, employerId, open: true }).lean();
      if (again) return again;
    }
  }
  throw new Error('Гүйлгээний утга үүсгэж чадсангүй');
}
