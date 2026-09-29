import { handle, ok, requireUser } from '@/lib/guards';
import { employerProfileSchema, studentProfileSchema } from '@/lib/validators';
import { User } from '@/models';

export const PATCH = handle(async (req: Request) => {
  const me = await requireUser(['student', 'employer']);
  const body = await req.json();
  const data = me.role === 'employer' ? employerProfileSchema.parse(body) : studentProfileSchema.parse(body);
  await User.updateOne({ _id: me.id }, data);
  return ok();
});
