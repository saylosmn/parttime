import { Types } from 'mongoose';
import { handle, ok, requireUser, HttpError } from '@/lib/guards';
import { Application, Review, User } from '@/models';
import { AVAILABILITY, type Availability } from '@/lib/config';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Ажил олгогч өөрийн зарт ирсэн өргөдлийн оюутны профайлыг харна:
 * ил болсон үнэлгээ, шошго, хэдэн удаа ажилласан, "Ирээгүй" хэдэн удаа.
 * Утасны дугаар зөвхөн урьсны дараа (бусад дүрэмтэй ижил).
 */
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const me = await requireUser(['employer']);
  if (!Types.ObjectId.isValid(id)) throw new HttpError(404, 'Өргөдөл олдсонгүй');
  const app = await Application.findById(id).lean();
  if (!app || (me.role !== 'admin' && app.employerId.toString() !== me.id)) throw new HttpError(404, 'Өргөдөл олдсонгүй');

  const [s, reviews, completed, tagAgg] = await Promise.all([
    User.findById(app.studentId, 'name school course district availability bio ratingAvg ratingCount phone createdAt').lean(),
    Review.find({ toUserId: app.studentId, visible: true, direction: 'employer_to_student' }).sort({ createdAt: -1 }).limit(10).lean(),
    Application.countDocuments({ studentId: app.studentId, status: 'completed' }),
    Review.aggregate([
      { $match: { toUserId: app.studentId, visible: true } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
    ]),
  ]);
  if (!s) throw new HttpError(404, 'Оюутан олдсонгүй');
  const phoneVisible = ['invited', 'hired', 'completed'].includes(app.status);

  return ok({
    name: s.name,
    school: s.school,
    course: s.course,
    district: s.district,
    availability: (s.availability ?? []).map((x) => AVAILABILITY[x as Availability]),
    bio: s.bio,
    ratingAvg: s.ratingAvg,
    ratingCount: s.ratingCount,
    completed,
    noShows: tagAgg.find((t) => t._id === 'Ирээгүй')?.n ?? 0,
    tags: tagAgg.map((t) => ({ tag: t._id as string, n: t.n as number })),
    reviews: reviews.map((r) => ({ stars: r.stars, tags: r.tags, comment: r.comment, at: r.createdAt })),
    phone: phoneVisible ? s.phone : null,
    since: s.createdAt,
    message: app.message,
  });
});
