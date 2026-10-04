import { z } from 'zod';
import { handle, ok, requireUser, HttpError } from '@/lib/guards';
import { User } from '@/models';

const schema = z.object({
  jobAlerts: z.enum(['all', 'district', 'off']).optional(), // оюутан: шинэ зарын мэдэгдэл
  appAlerts: z.enum(['each', 'hourly']).optional(), // ажил олгогч: шинэ өргөдлийн push
});

/** Мэдэгдлийн тохиргоо. */
export const PATCH = handle(async (req: Request) => {
  const me = await requireUser(['student', 'employer']);
  const data = schema.parse(await req.json());
  if (data.jobAlerts && me.role !== 'student') throw new HttpError(403, 'Эрх хүрэхгүй байна');
  if (data.appAlerts && me.role !== 'employer') throw new HttpError(403, 'Эрх хүрэхгүй байна');
  await User.updateOne({ _id: me.id }, data);
  return ok();
});
