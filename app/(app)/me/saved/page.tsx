import Link from 'next/link';
import { Bookmark, ChevronLeft } from 'lucide-react';
import { pageUser } from '@/lib/guards';
import { Job, User } from '@/models';
import { toCard } from '@/lib/queries';
import { EmptyState } from '@/components/ui';
import { JobRow } from '@/components/JobCard';

export const metadata = { title: 'Хадгалсан зарууд' };
export const dynamic = 'force-dynamic';

export default async function SavedJobs() {
  const me = await pageUser(['student']);
  const user = await User.findById(me.id, 'savedJobs').lean();
  const ids = user?.savedJobs ?? [];
  const jobs = await Job.find({ _id: { $in: ids } })
    .populate('employerId', 'name companyName verified ratingAvg ratingCount')
    .lean();
  // Хадгалсан дарааллаар (сүүлд хадгалсан нь дээрээ)
  const order = new Map(ids.map((id, i) => [id.toString(), i]));
  jobs.sort((a, b) => (order.get(b._id.toString()) ?? 0) - (order.get(a._id.toString()) ?? 0));
  const now = new Date();
  const active = jobs.filter((j) => j.status === 'active' && j.expiresAt > now);
  const closed = jobs.filter((j) => !(j.status === 'active' && j.expiresAt > now));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/me/profile" className="icon-btn" aria-label="Буцах">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="h-display text-2xl">Хадгалсан зарууд</h1>
      </div>
      {jobs.length === 0 ? (
        <EmptyState
          icon={<Bookmark size={22} />}
          title="Хадгалсан зар алга"
          body="Зарын дэлгэрэнгүй хуудасны баруун дээд буланд байрлах хадгалах товчийг дарж дараа үзэхээр хадгалаарай."
          action={
            <Link href="/" className="btn-primary">
              Ажил хайх
            </Link>
          }
        />
      ) : (
        <>
          <div className="space-y-3">
            {active.map((j) => (
              <JobRow key={j._id.toString()} job={toCard(j, now)} />
            ))}
          </div>
          {closed.length > 0 && (
            <section className="space-y-3 opacity-60">
              <h2 className="text-sm font-semibold text-muted">Хаагдсан зарууд</h2>
              {closed.map((j) => (
                <JobRow key={j._id.toString()} job={toCard(j, now)} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
