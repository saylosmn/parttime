import { handle, ok, requireUser, HttpError } from '@/lib/guards';
import { reviewSchema } from '@/lib/validators';
import { Application, Review } from '@/models';
import { REVIEW_TAGS } from '@/lib/config';
import { revealReviews } from '@/lib/services';

export const POST = handle(async (req: Request) => {
  const me = await requireUser(['student', 'employer']);
  const input = reviewSchema.parse(await req.json());
  const app = await Application.findById(input.applicationId);
  if (!app) throw new HttpError(404, 'Өргөдөл олдсонгүй');
  if (app.status !== 'completed') throw new HttpError(400, 'Зөвхөн дууссан ажлыг үнэлнэ');

  let direction: 'student_to_employer' | 'employer_to_student';
  let toUserId;
  if (app.studentId.toString() === me.id) {
    direction = 'student_to_employer';
    toUserId = app.employerId;
  } else if (app.employerId.toString() === me.id) {
    direction = 'employer_to_student';
    toUserId = app.studentId;
  } else {
    throw new HttpError(403, 'Та энэ ажилд оролцоогүй байна');
  }

  const allowed = REVIEW_TAGS[direction] as readonly string[];
  const tags = input.tags.filter((t) => allowed.includes(t));

  const exists = await Review.exists({ applicationId: app._id, direction });
  if (exists) throw new HttpError(409, 'Та энэ ажлыг аль хэдийн үнэлсэн');

  await Review.create({
    applicationId: app._id,
    fromUserId: me.id,
    toUserId,
    direction,
    stars: input.stars,
    tags,
    comment: input.comment || undefined,
  });
  // Хоёр тал үнэлсэн бол ил болгоно
  await revealReviews(app._id);
  return ok({}, 201);
});
