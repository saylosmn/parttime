import { Types } from 'mongoose';
import { Application, Job, Review, User } from '@/models';
import { notify } from './notify';
import { AVAILABILITY, type AppStatus, type Availability } from './config';

export type ApplicantView = {
  id: string;
  status: AppStatus;
  message?: string;
  createdAt: string;
  interviewAt?: string;
  interviewResponse?: string | null;
  rescheduleNote?: string;
  reviewedByMe: boolean;
  job: { id: string; title: string };
  student: {
    name: string;
    school?: string;
    course?: number;
    district?: string;
    availability: string;
    bio?: string;
    ratingAvg: number;
    ratingCount: number;
    phone?: string; // Зөвхөн урьсны дараа
  };
};

const PHONE_VISIBLE: AppStatus[] = ['invited', 'hired', 'completed'];

/** Ажил олгогчийн өргөдлүүдийг (утасны дугаарыг нууцалж) буцаана. */
export async function loadApplicants(employerId: string, filter: { jobId?: string; statuses?: AppStatus[] } = {}, limit = 100): Promise<ApplicantView[]> {
  const q: Record<string, unknown> = { employerId: new Types.ObjectId(employerId) };
  if (filter.jobId) q.jobId = new Types.ObjectId(filter.jobId);
  if (filter.statuses) q.status = { $in: filter.statuses };
  const apps = await Application.find(q).sort({ createdAt: -1 }).limit(limit).lean();
  const [students, jobs, myReviews] = await Promise.all([
    User.find({ _id: { $in: apps.map((a) => a.studentId) } }).lean(),
    Job.find({ _id: { $in: apps.map((a) => a.jobId) } }, 'title').lean(),
    Review.find({ applicationId: { $in: apps.map((a) => a._id) }, fromUserId: employerId }, 'applicationId').lean(),
  ]);
  const sMap = new Map(students.map((s) => [s._id.toString(), s]));
  const jMap = new Map(jobs.map((j) => [j._id.toString(), j]));
  const reviewed = new Set(myReviews.map((r) => r.applicationId.toString()));

  return apps.map((a) => {
    const s = sMap.get(a.studentId.toString());
    const status = a.status as AppStatus;
    return {
      id: a._id.toString(),
      status,
      message: a.message ?? undefined,
      createdAt: new Date(a.createdAt).toISOString(),
      interviewAt: a.interviewAt ? new Date(a.interviewAt).toISOString() : undefined,
      interviewResponse: a.interviewResponse ?? null,
      rescheduleNote: a.rescheduleNote ?? undefined,
      reviewedByMe: reviewed.has(a._id.toString()),
      job: { id: a.jobId.toString(), title: jMap.get(a.jobId.toString())?.title ?? '' },
      student: {
        name: s?.name ?? 'Оюутан',
        school: s?.school ?? undefined,
        course: s?.course ?? undefined,
        district: s?.district ?? undefined,
        availability: (s?.availability ?? []).map((x) => AVAILABILITY[x as Availability]).join(', '),
        bio: s?.bio ?? undefined,
        ratingAvg: s?.ratingAvg ?? 0,
        ratingCount: s?.ratingCount ?? 0,
        phone: PHONE_VISIBLE.includes(status) ? s?.phone ?? undefined : undefined,
      },
    };
  });
}

/** Ажил олгогч өргөдлүүдийг нээхэд 'sent' → 'viewed' болгож оюутанд мэдэгдэнэ. */
export async function markViewed(employerId: string, jobId?: string) {
  const q: Record<string, unknown> = { employerId, status: 'sent' };
  if (jobId) q.jobId = jobId;
  const apps = await Application.find(q, 'studentId jobId').lean();
  if (!apps.length) return;
  await Application.updateMany({ _id: { $in: apps.map((a) => a._id) }, status: 'sent' }, { status: 'viewed' });
  const jobs = await Job.find({ _id: { $in: apps.map((a) => a.jobId) } }, 'title').lean();
  const titles = new Map(jobs.map((j) => [j._id.toString(), j.title]));
  await Promise.all(
    apps.map((a) =>
      notify(a.studentId, {
        type: 'application_viewed',
        title: 'Таны өргөдлийг ажил олгогч харлаа',
        body: `«${titles.get(a.jobId.toString()) ?? ''}»`,
        link: '/me/applications',
      }),
    ),
  );
}
