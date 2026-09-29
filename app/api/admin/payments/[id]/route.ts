import { z } from 'zod';
import { handle, ok, requireUser, HttpError } from '@/lib/guards';
import { decidePayment } from '@/lib/payments';
import { sendTelegram, tgEscape } from '@/lib/telegram';

type Ctx = { params: { id: string } };
export const maxDuration = 60;

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('confirm') }),
  z.object({ action: z.literal('reject'), note: z.string().trim().min(3, 'Шалтгаан бичнэ үү').max(200) }),
]);

/** Админ сайтаас баталгаажуулах/татгалзах (Telegram товчтой ижил логик). */
export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  await requireUser(['admin']);
  const input = schema.parse(await req.json());
  const r = await decidePayment(params.id, input.action, input.action === 'reject' ? input.note : undefined);
  if (!r.ok) throw new HttpError(409, 'Төлбөр олдсонгүй эсвэл аль хэдийн шийдвэрлэгдсэн');
  await sendTelegram(
    r.action === 'confirm'
      ? `✅ Төлбөр <code>${r.code}</code> сайтаас баталгаажлаа — «${tgEscape(r.jobTitle)}» онцлох боллоо.`
      : `❌ Төлбөр <code>${r.code}</code> сайтаас цуцлагдлаа.`,
  );
  return ok();
});
