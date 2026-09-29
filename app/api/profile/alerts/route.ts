import { z } from 'zod';
import { handle, ok, requireUser } from '@/lib/guards';
import { User } from '@/models';

const schema = z.object({ jobAlerts: z.enum(['all', 'district', 'off']) });

/** Оюутны шинэ зарын мэдэгдлийн тохиргоо. */
export const PATCH = handle(async (req: Request) => {
  const me = await requireUser(['student']);
  const { jobAlerts } = schema.parse(await req.json());
  await User.updateOne({ _id: me.id }, { jobAlerts });
  return ok();
});
