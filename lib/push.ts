import webpush from 'web-push';
import { PushSubscription } from '@/models';

let configured = false;
function configure() {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', pub, priv);
  configured = true;
  return true;
}

export type PushPayload = { title: string; body: string; link: string; tag?: string };
type Sub = { _id: unknown; endpoint: string; keys?: { p256dh: string; auth: string } | null };

/** Subscription-уудад зэрэг (concurrency хязгаартай) илгээнэ. 404/410 бол устгана. */
async function deliver(subs: Sub[], payload: PushPayload, concurrency = 50) {
  const data = JSON.stringify(payload);
  const dead: unknown[] = [];
  let i = 0;
  const worker = async () => {
    while (i < subs.length) {
      const s = subs[i++];
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.keys!.p256dh, auth: s.keys!.auth } },
          data,
          { TTL: 60 * 60 * 24 },
        );
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) dead.push(s._id);
        else console.warn('push error', code);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, subs.length) }, worker));
  if (dead.length) await PushSubscription.deleteMany({ _id: { $in: dead } });
}

/** Хэрэглэгчийн бүх төхөөрөмж рүү push илгээнэ. */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!configure()) return;
  const subs = await PushSubscription.find({ userId }).lean();
  await deliver(subs, payload);
}

/** Олон хэрэглэгчид нэг query-гээр subscription авч илгээнэ (бүх оюутанд зарлах гэх мэт). */
export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  if (!configure() || !userIds.length) return;
  const subs = await PushSubscription.find({ userId: { $in: userIds } }).lean();
  await deliver(subs, payload);
}
