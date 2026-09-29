import { NextResponse } from 'next/server';
import { handle, requireUser } from '@/lib/guards';
import { adminChatIds, sendTelegram, siteUrl, tgApi } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

/**
 * Админ нэг удаа нээнэ: Telegram webhook-ийг бүртгэж, туршилтын мессеж илгээнэ.
 * https://<домэйн>/api/telegram/setup
 */
export const GET = handle(async (req: Request) => {
  await requireUser(['admin']);
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!process.env.TELEGRAM_BOT_TOKEN || !secret || !adminChatIds().length) {
    return NextResponse.json(
      { ok: false, error: 'TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_WEBHOOK_SECRET env-үүдийг тохируулаад Redeploy хийнэ үү' },
      { status: 400 },
    );
  }
  const origin = new URL(req.url).origin.startsWith('http://localhost') ? siteUrl() : new URL(req.url).origin;
  const url = `${origin}/api/telegram/webhook`;
  const hook = await tgApi('setWebhook', { url, secret_token: secret, allowed_updates: ['callback_query'], drop_pending_updates: true });
  const sent = await sendTelegram('🤖 Цаг бот холбогдлоо. Админы мэдэгдлүүд энд давхар ирнэ, төлбөрийг товчоор баталгаажуулна.');
  return NextResponse.json({ ok: Boolean(hook?.ok), webhook: url, telegram: hook?.description ?? null, testMessageSent: sent });
});
