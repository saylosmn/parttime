import { randomInt } from 'node:crypto';
import { z } from 'zod';
import { handle, ok, requireUser, HttpError } from '@/lib/guards';
import { Job, Payment, User } from '@/models';
import { FEATURE_PRICE, formatDateTime } from '@/lib/config';
import { notifyAdmins } from '@/lib/notify';
import { sendTelegram, tgEscape } from '@/lib/telegram';

const schema = z.object({ jobId: z.string().regex(/^[a-f0-9]{24}$/i, 'Зар сонгоно уу') });

/** Ажил олгогч онцлох зарын төлбөрийн хүсэлт үүсгэнэ → санамсаргүй 4 оронтой гүйлгээний утга. */
export const POST = handle(async (req: Request) => {
  const me = await requireUser(['employer']);
  const { jobId } = schema.parse(await req.json());
  const job = await Job.findById(jobId, 'title employerId status');
  if (!job || job.employerId.toString() !== me.id) throw new HttpError(404, 'Зар олдсонгүй');
  if (job.status !== 'active') throw new HttpError(400, 'Зөвхөн нийтлэгдсэн зарыг онцлох болгоно');

  // Нэг зарт хүлээгдэж буй хүсэлт байвал шинээр үүсгэхгүй, хуучин кодыг нь буцаана
  const existing = await Payment.findOne({ jobId, status: 'pending' }).lean();
  if (existing) return ok({ id: existing._id.toString(), code: existing.code, amount: existing.amount, existing: true });

  const count = await Payment.countDocuments({ employerId: me.id, status: 'pending' });
  if (count >= 5) throw new HttpError(429, 'Хүлээгдэж буй төлбөр хэт олон байна. Админ баталгаажуулахыг хүлээнэ үү.');

  // Хүлээгдэж буй төлбөрүүдийн дунд давхардахгүй код (unique index давхар хамгаална)
  let payment;
  for (let i = 0; i < 10 && !payment; i++) {
    const code = String(randomInt(1000, 10000));
    try {
      payment = await Payment.create({ employerId: me.id, jobId, code, amount: FEATURE_PRICE.amount, days: FEATURE_PRICE.days });
    } catch (e) {
      if ((e as { code?: number }).code !== 11000) throw e;
    }
  }
  if (!payment) throw new HttpError(503, 'Код үүсгэж чадсангүй, дахин оролдоно уу');

  const employer = await User.findById(me.id, 'companyName name phone').lean();
  const company = employer?.companyName || employer?.name || 'Ажил олгогч';
  await notifyAdmins({
    type: 'payment_new',
    title: `Шинэ төлбөр: гүйлгээний утга ${payment.code}`,
    body: `${company} «${job.title}» зарыг онцлох болгохоор ${payment.amount.toLocaleString('en-US')}₮ шилжүүлнэ. Дансаа шалгаад баталгаажуулна уу.`,
    link: '/admin/payments',
  });
  await sendTelegram(
    [
      '💳 <b>Шинэ төлбөрийн хүсэлт</b>',
      `Гүйлгээний утга: <code>${payment.code}</code>`,
      `Дүн: ${payment.amount.toLocaleString('en-US')}₮ (${payment.days} хоног онцлох)`,
      `Байгууллага: ${tgEscape(company)}${employer?.phone ? ` · ${tgEscape(employer.phone)}` : ''}`,
      `Зар: «${tgEscape(job.title)}»`,
      `Цаг: ${formatDateTime(payment.createdAt)}`,
      '',
      `Дансанд орсныг шалгаад баталгаажуулна уу: ${process.env.AUTH_URL || 'https://parttime-three.vercel.app'}/admin/payments`,
    ].join('\n'),
  );
  return ok({ id: payment._id.toString(), code: payment.code, amount: payment.amount }, 201);
});
