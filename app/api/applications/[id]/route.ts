import { handle, ok, requireUser, HttpError } from '@/lib/guards';
import { applicationActionSchema } from '@/lib/validators';
import { Application, Job, User } from '@/models';
import { notify } from '@/lib/notify';
import { formatDateTime } from '@/lib/config';

type Ctx = { params: { id: string } };

const EMPLOYER_ACTIONS = ['invite', 'reject', 'hire', 'complete'] as const;

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const me = await requireUser(['student', 'employer']);
  const input = applicationActionSchema.parse(await req.json());
  const app = await Application.findById(params.id);
  if (!app) throw new HttpError(404, 'Өргөдөл олдсонгүй');
  const job = await Job.findById(app.jobId, 'title');
  const jobTitle = job?.title ?? 'Ажил';

  const isEmployerAction = (EMPLOYER_ACTIONS as readonly string[]).includes(input.action);
  if (isEmployerAction) {
    if (me.role !== 'admin' && app.employerId.toString() !== me.id) throw new HttpError(403, 'Эрх хүрэхгүй байна');
  } else if (app.studentId.toString() !== me.id) {
    throw new HttpError(403, 'Эрх хүрэхгүй байна');
  }

  const employer = await User.findById(app.employerId, 'name companyName');
  const employerName = employer?.companyName || employer?.name || 'Ажил олгогч';
  const student = await User.findById(app.studentId, 'name');
  const studentName = student?.name || 'Оюутан';

  const need = (...allowed: string[]) => {
    if (!allowed.includes(app.status)) throw new HttpError(400, 'Энэ төлөвт энэ үйлдэл хийх боломжгүй');
  };

  switch (input.action) {
    case 'invite': {
      need('sent', 'viewed', 'invited');
      if (input.interviewAt.getTime() < Date.now()) throw new HttpError(400, 'Ирээдүйн цаг сонгоно уу');
      app.status = 'invited';
      app.interviewAt = input.interviewAt;
      app.interviewResponse = null;
      app.rescheduleNote = undefined;
      await app.save();
      await notify(app.studentId, {
        type: 'interview_invite',
        title: 'Ярилцлагад урилаа',
        body: `${employerName} таныг ${formatDateTime(input.interviewAt)}-д урьж байна`,
        link: '/notifications',
        meta: { applicationId: app._id.toString() },
      });
      break;
    }
    case 'reject': {
      need('sent', 'viewed', 'invited');
      app.status = 'rejected';
      await app.save();
      await notify(app.studentId, {
        type: 'application_rejected',
        title: `«${jobTitle}»`,
        body: 'Уучлаарай, энэ удаа өөр хүн сонгогдлоо',
        link: '/me/applications',
      });
      break;
    }
    case 'hire': {
      need('sent', 'viewed', 'invited');
      app.status = 'hired';
      await app.save();
      await notify(app.studentId, {
        type: 'application_hired',
        title: 'Баяр хүргэе! Та ажилд орлоо',
        body: `${employerName}: «${jobTitle}»`,
        link: '/me/applications',
      });
      break;
    }
    case 'complete': {
      need('hired');
      app.status = 'completed';
      app.completedAt = new Date();
      await app.save();
      const meta = { applicationId: app._id.toString() };
      await notify(app.studentId, {
        type: 'review_request',
        title: 'Ажлаа үнэлээрэй',
        body: `«${jobTitle}» ажил дууслаа. Ажил олгогчийг үнэлнэ үү.`,
        link: '/notifications',
        meta,
      });
      await notify(app.employerId, {
        type: 'review_request',
        title: 'Ажлаа үнэлээрэй',
        body: `${studentName}-ийн «${jobTitle}» ажил дууслаа. Оюутныг үнэлнэ үү.`,
        link: `/employer/jobs/${app.jobId}`,
        meta,
      });
      break;
    }
    case 'accept_invite': {
      need('invited');
      app.interviewResponse = 'accepted';
      await app.save();
      await notify(app.employerId, {
        type: 'interview_accepted',
        title: `${studentName} урилгыг зөвшөөрлөө`,
        body: `«${jobTitle}» · ${app.interviewAt ? formatDateTime(app.interviewAt) : ''}`,
        link: `/employer/jobs/${app.jobId}`,
      });
      break;
    }
    case 'reschedule': {
      need('invited');
      app.interviewResponse = 'reschedule';
      app.rescheduleNote = input.note;
      await app.save();
      await notify(app.employerId, {
        type: 'interview_reschedule',
        title: `${studentName} цаг солихыг хүслээ`,
        body: input.note,
        link: `/employer/jobs/${app.jobId}`,
      });
      break;
    }
  }
  return ok({ status: app.status });
});
