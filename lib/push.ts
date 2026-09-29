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

/** Хэрэглэгчийн бүх төхөөрөмж рүү push илгээнэ. 404/410 бол subscription-ыг устгана. */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!configure()) return;
  const subs = await PushSubscription.find({ userId }).lean();
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.keys!.p256dh, auth: s.keys!.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 24 },
        );
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await PushSubscription.deleteOne({ _id: s._id });
        else console.warn('push error', code);
      }
    }),
  );
}
