import { Types } from 'mongoose';
import { Notification, User } from '@/models';
import { sendPushToUser } from './push';
import { adminEmails } from './config';

export type NotifyType =
  | 'application_new'
  | 'application_viewed'
  | 'interview_invite'
  | 'interview_accepted'
  | 'interview_reschedule'
  | 'application_rejected'
  | 'application_hired'
  | 'job_approved'
  | 'job_rejected'
  | 'job_nearby'
  | 'review_request'
  | 'job_expiring'
  | 'low_rating'
  | 'report_new'
  | 'job_pending';

export type NotifyInput = {
  type: NotifyType;
  title: string;
  body?: string;
  link: string;
  meta?: Record<string, unknown>;
};

/** Апп доторх мэдэгдэл + Web Push хоёуланг нь илгээнэ. Push алдаа гарсан ч апп доторх нь үлдэнэ. */
export async function notify(userId: string | Types.ObjectId, n: NotifyInput) {
  const uid = userId.toString();
  await Notification.create({ userId: uid, ...n, body: n.body ?? '' });
  try {
    await sendPushToUser(uid, { title: n.title, body: n.body ?? '', link: n.link, tag: n.type });
  } catch (e) {
    console.warn('notify push failed', e);
  }
}

export async function notifyMany(userIds: (string | Types.ObjectId)[], n: NotifyInput) {
  if (!userIds.length) return;
  await Notification.insertMany(userIds.map((u) => ({ userId: u, ...n, body: n.body ?? '' })));
  // Push-ийг жижиг багцаар илгээнэ
  const ids = userIds.map(String);
  for (let i = 0; i < ids.length; i += 20) {
    await Promise.all(
      ids.slice(i, i + 20).map((id) =>
        sendPushToUser(id, { title: n.title, body: n.body ?? '', link: n.link, tag: n.type }).catch(() => {}),
      ),
    );
  }
}

export async function notifyAdmins(n: NotifyInput) {
  const admins = await User.find({ $or: [{ role: 'admin' }, { email: { $in: adminEmails() } }] }, '_id').lean();
  await notifyMany(admins.map((a) => a._id), n);
}
