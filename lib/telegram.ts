/**
 * Админы Telegram руу мессеж илгээнэ (Bot API).
 * TELEGRAM_BOT_TOKEN:      @BotFather-оос авсан токен
 * TELEGRAM_CHAT_ID:        мессеж очих chat/group-ийн ID (таслалаар хэд хэдийг)
 * TELEGRAM_WEBHOOK_SECRET: товч дарахад Telegram-аас ирэх хүсэлтийг баталгаажуулах нууц
 * Тохируулаагүй бол чимээгүй алгасна — апп доторх мэдэгдэл хэвээр очно.
 */

export type TgButton = { text: string; data: string };

function token() {
  return process.env.TELEGRAM_BOT_TOKEN;
}

export function adminChatIds() {
  return (process.env.TELEGRAM_CHAT_ID || '').split(',').map((s) => s.trim()).filter(Boolean);
}

export async function tgApi(method: string, body: Record<string, unknown>) {
  const t = token();
  if (!t) return null;
  try {
    const r = await fetch(`https://api.telegram.org/bot${t}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    const json = await r.json().catch(() => null);
    if (!r.ok) console.warn('telegram error', method, r.status, json?.description);
    return json;
  } catch (e) {
    console.warn('telegram failed', method, e);
    return null;
  }
}

/** Бүх админ chat руу илгээнэ. `buttons` өгвөл мессежийн доор товч гарна (мөр бүр нэг массив). */
export async function sendTelegram(text: string, buttons?: TgButton[][]) {
  const chats = adminChatIds();
  if (!token() || !chats.length) return false;
  const reply_markup = buttons ? { inline_keyboard: buttons.map((row) => row.map((b) => ({ text: b.text, callback_data: b.data }))) } : undefined;
  const results = await Promise.all(
    chats.map((chat_id) => tgApi('sendMessage', { chat_id, text, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup })),
  );
  return results.some((r) => r?.ok);
}

/** HTML parse_mode-д хэрэглэгчийн текстийг аюулгүй болгоно. */
export function tgEscape(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function siteUrl() {
  return (process.env.AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://parttime-three.vercel.app').replace(/\/$/, '');
}
