import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { Application, Job, Notification, Review, User } from '@/models';
import { notify } from '@/lib/notify';
import { revealReviews } from '@/lib/services';
import { LIMITS, formatDateTime } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Vercel Cron: `Authorization: Bearer ${CRON_SECRET}` header-тэй дуудагдана.
export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await dbConnect();
  const now = new Date();
  const DAY = 86400_000;

  // 1. Хугацаа дууссан зарыг хаах
  const closed = await Job.updateMany({ status: 'active', expiresAt: { $lte: now } }, { status: 'closed' });

  // 2. Онцлох хугацаа дууссан
  await Job.updateMany({ isFeatured: true, featuredUntil: { $lte: now } }, { isFeatured: false });

  // 3. 2 хоногийн дараа хаагдах зарын сануулга
  const expiring = await Job.find({
    status: 'active',
    expiryWarned: { $ne: true },
    expiresAt: { $gt: now, $lte: new Date(now.getTime() + 2 * DAY) },
  }).lean();
  for (const j of expiring) {
    await notify(j.employerId, {
      type: 'job_expiring',
      title: `«${j.title}» зар 2 хоногийн дараа хаагдана`,
      body: 'Хугацаа дуусахаас өмнө хүнээ олоогүй бол зараа засаж дахин нийтлүүлэх эсвэл онцлох болгох боломжтой.',
      link: `/employer/jobs/${j._id}`,
    });
    await Job.updateOne({ _id: j._id }, { expiryWarned: true });
  }

  // 4. 7 хоног өнгөрсөн нуугдмал үнэлгээг ил болгох
  const cutoff = new Date(now.getTime() - LIMITS.reviewRevealDays * DAY);
  const staleApps = await Review.distinct('applicationId', { visible: false, createdAt: { $lte: cutoff } });
  const staleCompleted = await Application.distinct('_id', { _id: { $in: staleApps } });
  for (const id of staleCompleted) await revealReviews(String(id), true);

  // 5. 90 хоногоос хуучин уншсан мэдэгдлийг цэвэрлэх
  const cleaned = await Notification.deleteMany({ read: true, createdAt: { $lte: new Date(now.getTime() - 90 * DAY) } });

  // 6. Ярилцлагын сануулга: cron өдөрт нэг удаа (УБ 09:00) ажилладаг тул ойрын 36 цагийн ярилцлагуудыг сануулна
  const upcoming = await Application.find({
    status: 'invited',
    reminderSent: { $ne: true },
    interviewAt: { $gt: now, $lte: new Date(now.getTime() + 36 * 3600_000) },
  }).lean();
  const ubDay = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ulaanbaatar' }).format(d);
  for (const a of upcoming) {
    const job = await Job.findById(a.jobId, 'title address district').lean();
    const [student, employer] = await Promise.all([
      User.findById(a.studentId, 'name').lean(),
      User.findById(a.employerId, 'name companyName').lean(),
    ]);
    const when = ubDay(a.interviewAt!) === ubDay(now) ? 'Өнөөдөр' : 'Маргааш';
    const at = formatDateTime(a.interviewAt!);
    const place = [job?.address, job?.district].filter(Boolean).join(', ');
    await notify(a.studentId, {
      type: 'interview_reminder',
      title: `${when} ярилцлагатай: «${job?.title ?? ''}»`,
      body: `${employer?.companyName || employer?.name || 'Ажил олгогч'} · ${at}${place ? ` · ${place}` : ''}. Цагтаа очоорой, саатвал чатаар мэдэгдээрэй.`,
      link: `/chat/${a._id}`,
    });
    await notify(a.employerId, {
      type: 'interview_reminder',
      title: `${when} ярилцлагатай: ${student?.name ?? 'оюутан'}`,
      body: `«${job?.title ?? ''}» · ${at}${a.interviewResponse === 'accepted' ? ' · Оюутан зөвшөөрсөн' : ' · Оюутан хараахан хариулаагүй'}.`,
      link: `/employer/jobs/${a.jobId}`,
    });
    await Application.updateOne({ _id: a._id }, { reminderSent: true });
  }

  return NextResponse.json({
    closed: closed.modifiedCount,
    warned: expiring.length,
    revealed: staleCompleted.length,
    cleaned: cleaned.deletedCount,
    reminded: upcoming.length,
  });
}
