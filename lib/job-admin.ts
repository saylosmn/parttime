import { Job, User, type JobT } from '@/models';
import { notify, notifyAdmins } from './notify';
import { broadcastJob } from './services';
import { formatPay, type PayUnit } from './config';
import { tgEscape } from './telegram';

/** Зар зөвшөөрөх — админ хуудас болон Telegram товч хоёулаа ашиглана. pending-ээс л шилжүүлнэ. */
export async function approveJob(id: string) {
  const job = await Job.findOneAndUpdate({ _id: id, status: 'pending' }, { status: 'active', $unset: { rejectReason: 1 } }, { returnDocument: 'after' });
  if (!job) return null;
  await notify(job.employerId, {
    type: 'job_approved',
    title: `Таны «${job.title}» зар нийтлэгдлээ`,
    body: 'Админ шалгаж зөвшөөрлөө. Зар одоо бүх оюутанд харагдаж, тэдэнд мэдэгдэл очлоо. Өргөдөл ирэхэд танд мэдэгдэнэ.',
    link: `/jobs/${job._id}`,
  });
  await broadcastJob(job.toObject() as JobT);
  return job;
}

export async function rejectJob(id: string, reason: string) {
  const job = await Job.findOneAndUpdate({ _id: id, status: 'pending' }, { status: 'rejected', rejectReason: reason }, { returnDocument: 'after' });
  if (!job) return null;
  await notify(job.employerId, {
    type: 'job_rejected',
    title: `Таны «${job.title}» зар нийтлэгдсэнгүй`,
    body: `Шалтгаан: ${reason}. Зараа засаад дахин илгээх боломжтой.`,
    link: `/employer/jobs/${job._id}/edit`,
  });
  return job;
}

/**
 * Зарыг нийтлэх эсвэл шалгалтад оруулах.
 * Баталгаажсан ажил олгогчийн, сэжигтэй шинжгүй зар → шууд нийтлэгдэнэ (админ хүлээхгүй).
 * Бусад тохиолдолд pending болж админд мэдэгдэнэ. Зар заавал pending төлөвтэй хадгалагдсан байх ёстой.
 */
export async function publishOrReview(job: JobT, edited = false) {
  const employer = await User.findById(job.employerId, 'verified').lean();
  if (employer?.verified && !job.flagged) {
    await approveJob(job._id.toString());
    return 'published' as const;
  }
  await notifyJobPending(job, edited);
  return 'pending' as const;
}

/** Шалгах зар ирэхэд админд (апп + push + Telegram товчтой) мэдэгдэнэ. */
export async function notifyJobPending(job: JobT, edited = false) {
  const employer = await User.findById(job.employerId, 'companyName name verified').lean();
  const company = employer?.companyName || employer?.name || 'Ажил олгогч';
  const flags = job.flagReasons ?? [];
  await notifyAdmins(
    {
      type: 'job_pending',
      title: `${edited ? 'Засварласан' : 'Шалгах шинэ'} зар: «${job.title}»${flags.length ? ' ⚠️' : ''}`,
      body: flags.length
        ? `Сэжигтэй: ${flags.join('; ')}. Анхааралтай шалгана уу.`
        : 'Ажил олгогч зар илгээлээ. Зөвшөөрөх эсвэл шалтгаантай татгалзана уу.',
      link: '/admin',
    },
    {
      text: [
        `📝 <b>${edited ? 'Засварласан зар' : 'Шинэ зар'} шалгах</b>`,
        `«${tgEscape(job.title)}»`,
        `${tgEscape(company)}${employer?.verified ? ' ✔️' : ''}`,
        `${formatPay(job.payAmount, job.payUnit as PayUnit)} · ${tgEscape(job.district)} · ${tgEscape(job.schedule)}`,
        '',
        tgEscape(job.description.slice(0, 400)) + (job.description.length > 400 ? '…' : ''),
        ...(flags.length ? ['', `⚠️ <b>Сэжигтэй:</b> ${tgEscape(flags.join('; '))}`] : []),
      ].join('\n'),
      buttons: [
        [
          { text: '✅ Зөвшөөрөх', data: `job:a:${job._id}` },
          { text: '❌ Татгалзах', data: `job:r:${job._id}` },
        ],
      ],
    },
  );
}
