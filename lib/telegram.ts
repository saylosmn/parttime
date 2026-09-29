/**
 * Админы Telegram руу мессеж илгээнэ (Bot API).
 * TELEGRAM_BOT_TOKEN: @BotFather-оос авсан токен
 * TELEGRAM_CHAT_ID:   мессеж очих chat/group-ийн ID (таслалаар хэд хэдийг)
 * Тохируулаагүй бол чимээгүй алгасна — апп доторх мэдэгдэл хэвээр очно.
 */
export async function sendTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chats = (process.env.TELEGRAM_CHAT_ID || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!token || !chats.length) return false;
  const results = await Promise.all(
    chats.map(async (chat_id) => {
      try {
        const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id, text, parse_mode: 'HTML', disable_web_page_preview: true }),
          signal: AbortSignal.timeout(5000),
        });
        if (!r.ok) console.warn('telegram error', r.status, await r.text().catch(() => ''));
        return r.ok;
      } catch (e) {
        console.warn('telegram failed', e);
        return false;
      }
    }),
  );
  return results.some(Boolean);
}

/** HTML parse_mode-д хэрэглэгчийн текстийг аюулгүй болгоно. */
export function tgEscape(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
