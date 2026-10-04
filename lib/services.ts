import { Types } from 'mongoose';
import { Application, Job, Review, User, type JobT } from '@/models';
import { notify, notifyAdmins, notifyMany } from './notify';
import { LIMITS, formatPay, type PayUnit } from './config';

/** Хэрэглэгчийн ratingAvg/ratingCount-ыг ил болсон үнэлгээнүүдээс дахин тооцоолно. */
export async function recomputeRating(userId: Types.ObjectId | string) {
  const uid = new Types.ObjectId(userId.toString());
  const [agg] = await Review.aggregate([
    { $match: { toUserId: uid, visible: true } },
    { $group: { _id: null, avg: { $avg: '$stars' }, count: { $sum: 1 } } },
  ]);
  const avg = agg ? Math.round(agg.avg * 10) / 10 : 0;
  const count = agg?.count ?? 0;
  const user = await User.findByIdAndUpdate(uid, { ratingAvg: avg, ratingCount: count }, { returnDocument: 'after' });
  if (user?.role === 'employer' && count >= LIMITS.minRatingsForAvg && avg < LIMITS.lowRatingThreshold) {
    await notifyAdmins({
      type: 'low_rating',
      title: `Үнэлгээ буурсан: ${user.companyName || user.name}`,
      body: `Дундаж үнэлгээ ${avg.toFixed(1)} болж 3.0-аас доош орлоо (${count} үнэлгээ). Зарууд, гомдлыг нь шалгана уу.`,
      link: '/admin/users',
    });
  }
}

/** Тухайн өргөдлийн үнэлгээнүүдийг ил болгоно (хоёр тал үнэлсэн эсвэл 7 хоног өнгөрсөн). */
export async function revealReviews(applicationId: Types.ObjectId | string, force = false) {
  const reviews = await Review.find({ applicationId });
  const hidden = reviews.filter((r) => !r.visible);
  if (!hidden.length) return;
  if (!force && reviews.length < 2) return;
  await Review.updateMany({ applicationId }, { visible: true });
  await Promise.all(hidden.map((r) => recomputeRating(r.toUserId)));
}

/**
 * Шинэ зар нийтлэгдэхэд (админ зөвшөөрөх үед) БҮХ оюутанд нэг удаа мэдэгдэнэ.
 * Засвар хийгээд дахин зөвшөөрөгдсөн зарт давтан илгээхгүй (broadcastDone).
 * Мэдэгдэл нь дангаараа ойлгомжтой байхаар: юу, хэн, хэдэн төгрөг, хаана, хэзээ.
 */
export async function broadcastJob(job: JobT) {
  if (job.broadcastDone || job.status !== 'active') return;
  // Зэрэг дуудагдвал давхар илгээхээс сэргийлж атомаар тэмдэглэнэ
  const claimed = await Job.updateOne({ _id: job._id, broadcastDone: { $ne: true } }, { broadcastDone: true });
  if (!claimed.modifiedCount) return;

  const employer = await User.findById(job.employerId, 'name companyName').lean();
  const company = employer?.companyName || employer?.name || 'Ажил олгогч';
  const pay = formatPay(job.payAmount, job.payUnit as PayUnit);
  // Оюутны тохиргоог хүндэтгэнэ: 'off' бол илгээхгүй, 'district' бол зөвхөн өөрийн дүүргийн зар
  const students = await User.find(
    {
      role: 'student',
      banned: { $ne: true },
      jobAlerts: { $ne: 'off' },
      $or: [{ jobAlerts: { $ne: 'district' } }, { district: job.district }],
    },
    '_id',
  ).lean();

  await notifyMany(
    students.map((s) => s._id),
    {
      type: 'job_new',
      title: job.isUrgent ? `Яаралтай ажил: ${job.title}` : `Шинэ ажлын зар: ${job.title}`,
      body: `${company} · ${pay} · ${job.district} дүүрэг · ${job.schedule}. Дэлгэрэнгүйг харж өргөдлөө илгээгээрэй.`,
      link: `/jobs/${job._id}`,
    },
  );
}

export async function applicationCounts(jobIds: Types.ObjectId[]) {
  const rows = await Application.aggregate([
    { $match: { jobId: { $in: jobIds } } },
    { $group: { _id: '$jobId', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [r._id.toString(), r.count as number]));
}

/** Зар бүрийн ажил олгогч хараахан нээж үзээгүй (sent) өргөдлийн тоо. */
export async function newApplicationCounts(jobIds: Types.ObjectId[]) {
  const rows = await Application.aggregate([
    { $match: { jobId: { $in: jobIds }, status: 'sent' } },
    { $group: { _id: '$jobId', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [r._id.toString(), r.count as number]));
}

export { notify };

/** Mongoose lean объектыг client component руу дамжуулах боломжтой болгоно. */
export function plain<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}
