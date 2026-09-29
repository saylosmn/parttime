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
  const user = await User.findByIdAndUpdate(uid, { ratingAvg: avg, ratingCount: count }, { new: true });
  if (user?.role === 'employer' && count >= LIMITS.minRatingsForAvg && avg < LIMITS.lowRatingThreshold) {
    await notifyAdmins({
      type: 'low_rating',
      title: 'Ажил олгогчийн үнэлгээ буурлаа',
      body: `${user.companyName || user.name}: ${avg.toFixed(1)} (${count} үнэлгээ)`,
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

/** Онцлох/яаралтай зар нийтлэгдэхэд тухайн дүүргийн тохирох оюутнуудад мэдэгдэнэ (≤200). */
export async function broadcastJob(job: JobT) {
  if (job.broadcastDone || job.status !== 'active' || !(job.isUrgent || job.isFeatured)) return;
  const wanted: string[] = [];
  if (job.tags?.includes('weekend')) wanted.push('weekend');
  if (job.tags?.includes('evening')) wanted.push('weekday_evening');
  const q: Record<string, unknown> = { role: 'student', banned: { $ne: true }, district: job.district };
  if (wanted.length) q.availability = { $in: wanted };
  const students = await User.find(q, '_id').limit(LIMITS.urgentBroadcastMax).lean();
  await Job.updateOne({ _id: job._id }, { broadcastDone: true });
  await notifyMany(
    students.map((s) => s._id),
    {
      type: 'job_nearby',
      title: job.isUrgent ? 'Танай дүүрэгт яаралтай ажил' : 'Танай дүүрэгт шинэ онцлох ажил',
      body: `${job.title}: ${formatPay(job.payAmount, job.payUnit as PayUnit)}`,
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

export { notify };

/** Mongoose lean объектыг client component руу дамжуулах боломжтой болгоно. */
export function plain<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}
