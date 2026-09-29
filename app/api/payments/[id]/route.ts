import { z } from 'zod';
import { handle, ok, requireUser, HttpError } from '@/lib/guards';
import { Job, Payment, User } from '@/models';
import { formatDateTime } from '@/lib/config';
import { notifyAdmins } from '@/lib/notify';
import { sendTelegram, tgEscape } from '@/lib/telegram';

type Ctx = { params: { id: string } };
const schema = z.object({ action: z.enum(['paid', 'cancel']) });

/**
 * Ажил олгогчийн үйлдэл:
 *  - paid:   "Төлбөр шилжүүлсэн" → админд + Telegram руу мэдэгдэнэ
 *  - cancel: гүйлгээ цуцлах (админ баталгаажуулахаас өмнө)
 */
export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const me = await requireUser(['employer']);
  const { action } = schema.parse(await req.json());

  if (action === 'cancel') {
    const p = await Payment.findOneAndUpdate(
      { _id: params.id, employerId: me.id, open: true },
      { status: 'cancelled', open: false },
      { new: true },
    );
    if (!p) throw new HttpError(409, 'Цуцлах боломжгүй: төлбөр аль хэдийн шийдвэрлэгдсэн байна');
    if (p.paidAt) {
      await sendTelegram(`❌ Гүйлгээ <code>${p.code}</code> ажил олгогч цуцаллаа.`);
    }
    return ok();
  }

  const p = await Payment.findOneAndUpdate(
    { _id: params.id, employerId: me.id, status: 'awaiting' },
    { status: 'pending', paidAt: new Date() },
    { new: true },
  );
  if (!p) throw new HttpError(409, 'Энэ төлбөрийг аль хэдийн мэдэгдсэн эсвэл цуцалсан байна');

  const [job, employer] = await Promise.all([
    Job.findById(p.jobId, 'title').lean(),
    User.findById(me.id, 'companyName name phone').lean(),
  ]);
  const company = employer?.companyName || employer?.name || 'Ажил олгогч';
  await notifyAdmins({
    type: 'payment_new',
    title: `Шинэ төлбөр: гүйлгээний утга ${p.code}`,
    body: `${company} «${job?.title ?? ''}» зарыг онцлох болгохоор ${p.amount.toLocaleString('en-US')}₮ шилжүүлсэн гэж мэдэгдлээ. Дансаа шалгаад баталгаажуулна уу.`,
    link: '/admin/payments',
  }, {
    // Telegram дээр дансаа шалгаад шууд товчоор шийдвэрлэнэ
    text: [
      '💳 <b>Шинэ төлбөр</b>',
      `Гүйлгээний утга: <code>${p.code}</code>`,
      `Дүн: ${p.amount.toLocaleString('en-US')}₮ (${p.days} хоног онцлох)`,
      `Байгууллага: ${tgEscape(company)}${employer?.phone ? ` · ${tgEscape(employer.phone)}` : ''}`,
      `Зар: «${tgEscape(job?.title ?? '')}»`,
      `Цаг: ${formatDateTime(p.paidAt!)}`,
      '',
      'Дансанд орсныг шалгаад доорх товчоор шийдвэрлэнэ үү.',
    ].join('\n'),
    buttons: [[
      { text: '✅ Баталгаажуулах', data: `pay:c:${p._id}` },
      { text: '❌ Цуцлах', data: `pay:r:${p._id}` },
    ]],
  });
  return ok();
});
