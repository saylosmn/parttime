import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Types } from 'mongoose';
import { BriefcaseBusiness, ChevronLeft, MapPin, ShieldCheck, Star, Users } from 'lucide-react';
import { dbConnect } from '@/lib/db';
import { Application, Job, Review, User } from '@/models';
import { toCard } from '@/lib/queries';
import { timeAgo } from '@/lib/config';
import { Avatar, EmptyState, Rating, Verified } from '@/components/ui';
import { JobRow } from '@/components/JobCard';

export const dynamic = 'force-dynamic';

export async function generateMetadata(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!Types.ObjectId.isValid(params.id)) return { title: 'Ажил олгогч' };
  await dbConnect();
  const u = await User.findById(params.id, 'companyName name').lean();
  return { title: u?.companyName || u?.name || 'Ажил олгогч' };
}

/** Ажил олгогчийн нийтийн профайл: идэвхтэй зарууд, үнэлгээ, оюутнуудын сэтгэгдэл. */
export default async function CompanyPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!Types.ObjectId.isValid(params.id)) notFound();
  await dbConnect();
  const company = await User.findOne({ _id: params.id, role: 'employer', banned: { $ne: true } }).lean();
  if (!company) notFound();

  const now = new Date();
  const [jobs, reviews, hired, tagAgg] = await Promise.all([
    Job.find({ employerId: company._id, status: 'active', expiresAt: { $gt: now } })
      .sort({ createdAt: -1 })
      .populate('employerId', 'name companyName verified ratingAvg ratingCount')
      .lean(),
    Review.find({ toUserId: company._id, visible: true, direction: 'student_to_employer' }).sort({ createdAt: -1 }).limit(20).lean(),
    Application.countDocuments({ employerId: company._id, status: { $in: ['hired', 'completed'] } }),
    Review.aggregate([
      { $match: { toUserId: company._id, visible: true } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
    ]),
  ]);
  const name = company.companyName || company.name;

  return (
    <div className="space-y-5 pb-6">
      <Link href="/" className="icon-btn" aria-label="Буцах">
        <ChevronLeft size={20} />
      </Link>

      <div className="flex items-center gap-4">
        <Avatar name={name} size="lg" />
        <div className="min-w-0">
          <h1 className="h-display flex items-center gap-2 text-xl leading-tight">
            {name} {company.verified && <Verified />}
          </h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted">
            <MapPin size={14} /> {company.companyDistrict ?? 'Улаанбаатар'}
          </p>
          <Rating avg={company.ratingAvg} count={company.ratingCount} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <Mini icon={<BriefcaseBusiness size={16} />} n={jobs.length} l="Идэвхтэй зар" />
        <Mini icon={<Users size={16} />} n={hired} l="Ажилд авсан" />
        <Mini icon={<Star size={16} />} n={company.ratingCount} l="Үнэлгээ" />
      </div>

      <div className="card flex items-center gap-3 p-4 text-sm text-soft">
        <ShieldCheck size={20} className={company.verified ? 'text-accent' : 'text-muted'} />
        {company.verified ? 'Админ баталгаажуулсан байгууллага' : 'Баталгаажаагүй байгууллага'} · {timeAgo(company.createdAt)} бүртгүүлсэн
      </div>

      {tagAgg.length > 0 && (
        <section>
          <h2 className="mb-2 font-bold">Оюутнуудын өгсөн шошго</h2>
          <div className="flex flex-wrap gap-2">
            {tagAgg.map((t) => (
              <span key={t._id} className="badge border border-green-line bg-green-bg py-1.5 text-green-soft">
                {t._id} · {t.n}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-bold">Идэвхтэй зарууд</h2>
        {jobs.length === 0 ? (
          <EmptyState icon={<BriefcaseBusiness size={22} />} title="Одоогоор идэвхтэй зар алга" />
        ) : (
          jobs.map((j) => <JobRow key={j._id.toString()} job={toCard(j, now)} />)
        )}
      </section>

      {reviews.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="font-bold">Сэтгэгдлүүд</h2>
          {reviews.map((r) => (
            <div key={r._id.toString()} className="card p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-0.5 text-star">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} fill={i < r.stars ? 'currentColor' : 'none'} />
                  ))}
                </span>
                <span className="text-xs text-muted">{timeAgo(r.createdAt)}</span>
              </div>
              {r.tags.length > 0 && <p className="mt-2 text-xs text-green-soft">{r.tags.join(' · ')}</p>}
              {r.comment && <p className="mt-1.5 text-sm text-soft">{r.comment}</p>}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function Mini({ icon, n, l }: { icon: React.ReactNode; n: number; l: string }) {
  return (
    <div className="card p-3.5">
      <span className="text-accent">{icon}</span>
      <p className="h-display mt-1.5 text-2xl">{n}</p>
      <p className="text-xs text-muted">{l}</p>
    </div>
  );
}
