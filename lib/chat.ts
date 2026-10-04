import { Types } from 'mongoose';
import { Application } from '@/models';

/** Чат зөвхөн урьсны дараа (invited / hired / completed) нээгдэнэ. */
export const CHAT_STATUSES = ['invited', 'hired', 'completed'];

/** Тухайн хэрэглэгч энэ өргөдлийн чатад оролцогч эсэхийг шалгаад, нөгөө талын ID-г буцаана. */
export async function chatAccess(applicationId: string, userId: string) {
  if (!Types.ObjectId.isValid(applicationId)) return null;
  const app = await Application.findById(applicationId).lean();
  if (!app) return null;
  const isStudent = app.studentId.toString() === userId;
  const isEmployer = app.employerId.toString() === userId;
  if (!isStudent && !isEmployer) return null;
  return {
    app,
    open: CHAT_STATUSES.includes(app.status),
    otherId: isStudent ? app.employerId.toString() : app.studentId.toString(),
    side: isStudent ? ('student' as const) : ('employer' as const),
  };
}
