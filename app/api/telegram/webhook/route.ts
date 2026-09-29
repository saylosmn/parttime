import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { dbConnect } from '@/lib/db';
import { decidePayment } from '@/lib/payments';
import { adminChatIds, tgApi, tgEscape } from '@/lib/telegram';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type CallbackQuery = {
  id: string;
  from: { id: number; first_name?: string; username?: string };
  data?: string;
  message?: { message_id: number; chat: { id: number }; text?: string };
};

function secretOk(req: Request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET || '';
  const got = req.headers.get('x-telegram-bot-api-secret-token') || '';
  if (!expected || got.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

/**
 * Telegram-ийн "Баталгаажуулах / Цуцлах" товч дарахад энд ирнэ.
 * Хамгаалалт: (1) setWebhook-д өгсөн нууц header, (2) зөвхөн TELEGRAM_CHAT_ID-д буй chat-аас.
 */
export async function POST(req: Request) {
  if (!secretOk(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const update = (await req.json().catch(() => null)) as { callback_query?: CallbackQuery } | null;
  const cq = update?.callback_query;
  if (!cq?.data || !cq.message) return NextResponse.json({ ok: true });

  const chatId = String(cq.message.chat.id);
  if (!adminChatIds().includes(chatId)) {
    await tgApi('answerCallbackQuery', { callback_query_id: cq.id, text: 'Эрх хүрэхгүй байна', show_alert: true });
    return NextResponse.json({ ok: true });
  }

  const m = cq.data.match(/^pay:([cr]):([a-f0-9]{24})$/i);
  if (!m) {
    await tgApi('answerCallbackQuery', { callback_query_id: cq.id });
    return NextResponse.json({ ok: true });
  }

  await dbConnect();
  const action = m[1] === 'c' ? 'confirm' : 'reject';
  const r = await decidePayment(m[2], action, action === 'reject' ? 'Гүйлгээ дансанд ороогүй байна' : undefined);
  const who = tgEscape(cq.from.username ? `@${cq.from.username}` : cq.from.first_name ?? 'админ');

  const status = !r.ok
    ? 'ℹ️ Энэ төлбөр аль хэдийн шийдвэрлэгдсэн эсвэл цуцлагдсан байна.'
    : r.action === 'confirm'
      ? `✅ <b>Баталгаажлаа</b> (${who}) — «${tgEscape(r.jobTitle)}» онцлох боллоо.`
      : `❌ <b>Цуцлагдлаа</b> (${who}) — ажил олгогчид мэдэгдэл очлоо.`;

  await Promise.all([
    tgApi('answerCallbackQuery', {
      callback_query_id: cq.id,
      text: !r.ok ? 'Аль хэдийн шийдвэрлэгдсэн' : r.action === 'confirm' ? 'Баталгаажлаа' : 'Цуцлагдлаа',
    }),
    // Товчнуудыг арилгаж, мессеж дээр үр дүнг бичнэ (давхар дарахаас сэргийлнэ)
    tgApi('editMessageText', {
      chat_id: cq.message.chat.id,
      message_id: cq.message.message_id,
      text: `${tgEscape(cq.message.text ?? '')}\n\n${status}`,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  ]);
  return NextResponse.json({ ok: true });
}
