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
      app.reminderSent = false; // Шинэ цагт дахин сануулна
      app.rescheduleNote = undefined;
      await app.save();
      await notify(app.studentId, {
        type: 'interview_invite',
        title: `Ярилцлагын урилга: «${jobTitle}»`,
        body: `${employerName} таныг ${formatDateTime(input.interviewAt)}-д ярилцлагад урьж байна. «Зөвшөөрөх» эсвэл «Цаг солих»-ыг дарж хариулна уу.`,
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
        title: `«${jobTitle}» өргөдлийн хариу`,
        body: `Уучлаарай, ${employerName} энэ удаа өөр хүн сонгосон байна. Бусад шинэ заруудаас өргөдөл илгээгээрэй.`,
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
        title: `Баяр хүргэе! Та «${jobTitle}» ажилд орлоо`,
        body: `${employerName} таныг ажилд авлаа. Ажлын дэлгэрэнгүйг ажил олгогчтой утсаар тохиролцоорой.`,
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
        title: `«${jobTitle}» ажил дууслаа — үнэлгээ өгнө үү`,
        body: `${employerName}-тай ажилласан туршлагаа 1–5 одоор үнэлээрэй. Таны үнэлгээ бусад оюутнуудад тусална.`,
        link: '/notifications',
        meta,
      });
      await notify(app.employerId, {
        type: 'review_request',
        title: `«${jobTitle}» ажил дууслаа — оюутныг үнэлнэ үү`,
        body: `${studentName}-ийн ажлыг 1–5 одоор үнэлээрэй. Хоёр тал үнэлсний дараа үнэлгээ нийтэд харагдана.`,
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
        title: `${studentName} ярилцлагад ирнэ`,
        body: `«${jobTitle}» ажлын ярилцлагын урилгыг зөвшөөрлөө${app.interviewAt ? `: ${formatDateTime(app.interviewAt)}` : ''}.`,
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
        title: `${studentName} ярилцлагын цаг солихыг хүслээ`,
        body: `«${jobTitle}»: "${input.note}". Шинэ цаг сонгож дахин урина уу.`,
        link: `/employer/jobs/${app.jobId}`,
      });
      break;
    }
  }
  return ok({ status: app.status });
});
