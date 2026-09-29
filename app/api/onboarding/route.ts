import { handle, ok, HttpError } from '@/lib/guards';
import { onboardingSchema } from '@/lib/validators';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/db';
import { User } from '@/models';

// Onboarding-оос өмнө role байхгүй тул requireUser биш, session-ыг шууд шалгана.
export const POST = handle(async (req: Request) => {
  const session = await auth();
  if (!session?.user?.id) throw new HttpError(401, 'Нэвтрэх шаардлагатай');
  await dbConnect();
  const user = await User.findById(session.user.id);
  if (!user) throw new HttpError(404, 'Хэрэглэгч олдсонгүй');
  if (user.onboarded && user.role !== 'admin') throw new HttpError(400, 'Бүртгэл аль хэдийн хийгдсэн');
  const { role, ...data } = onboardingSchema.parse(await req.json());
  Object.assign(user, data, { onboarded: true });
  if (user.role !== 'admin') user.role = role;
  await user.save();
  return ok({ role: user.role });
});
