import { Types } from 'mongoose';
import { Notification, User } from '@/models';
import { sendPushToUser, sendPushToUsers } from './push';
import { adminEmails } from './config';
import { sendTelegram, siteUrl, tgEscape, type TgButton } from './telegram';

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
  | 'job_new'
  | 'message_new'
  | 'interview_reminder'
  | 'payment_new'
  | 'payment_confirmed'
  | 'payment_rejected'
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
export async function notify(userId: string | Types.ObjectId, n: NotifyInput, opts: { push?: boolean } = {}) {
  const uid = userId.toString();
  await Notification.create({ userId: uid, ...n, body: n.body ?? '' });
  if (opts.push === false) return;
  try {
    await sendPushToUser(uid, { title: n.title, body: n.body ?? '', link: n.link, tag: n.type });
  } catch (e) {
    console.warn('notify push failed', e);
  }
}

/** Олон хэрэглэгчид (жишээ нь бүх оюутан) — DB-д багцаар бичиж, push-ийг нэг query-гээр авч зэрэг илгээнэ. */
export async function notifyMany(userIds: (string | Types.ObjectId)[], n: NotifyInput) {
  if (!userIds.length) return;
  const body = n.body ?? '';
  for (let i = 0; i < userIds.length; i += 1000) {
    await Notification.insertMany(
      userIds.slice(i, i + 1000).map((u) => ({ userId: u, ...n, body })),
      { ordered: false },
    );
  }
  try {
    await sendPushToUsers(userIds.map(String), { title: n.title, body, link: n.link, tag: n.type });
  } catch (e) {
    console.warn('notifyMany push failed', e);
  }
}

const ADMIN_ICONS: Partial<Record<NotifyType, string>> = {
  job_pending: '📝',
  report_new: '🚩',
  low_rating: '⚠️',
  payment_new: '💳',
};

/**
 * Админуудад: апп доторх мэдэгдэл + push + Telegram (давхар).
 * `tg.text` өгвөл Telegram-д тусгай текст, `tg.buttons` өгвөл хурдан үйлдлийн товч гарна.
 */
export async function notifyAdmins(n: NotifyInput, tg?: { text?: string; buttons?: TgButton[][] }) {
  const admins = await User.find({ $or: [{ role: 'admin' }, { email: { $in: adminEmails() } }] }, '_id').lean();
  const text =
    tg?.text ??
    [`${ADMIN_ICONS[n.type] ?? '🔔'} <b>${tgEscape(n.title)}</b>`, n.body ? tgEscape(n.body) : '', `${siteUrl()}${n.link}`]
      .filter(Boolean)
      .join('\n\n');
  await Promise.all([notifyMany(admins.map((a) => a._id), n), sendTelegram(text, tg?.buttons).catch(() => false)]);
}
