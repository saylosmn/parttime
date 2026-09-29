import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarDays, ChevronLeft, Clock, MapPin, ShieldCheck, Star } from 'lucide-react';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/db';
import { getJob, hiredCount } from '@/lib/queries';
import { Application, Review, User } from '@/models';
import { TAGS, JOB_STATUS, type PayUnit, type JobTag } from '@/lib/config';
import { Avatar, Pay, Rating, UrgentBadge, Verified } from '@/components/ui';
import { ApplySheet } from '@/components/ApplySheet';
import { ReportButton } from '@/components/ReportButton';
import { JobMap } from '@/components/JobMap';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { id: string } }) {
  await dbConnect();
  const job = await getJob(params.id);
  return { title: job?.title ?? 'Зар' };
}

export default async function JobPage({ params }: { params: { id: string } }) {
  await dbConnect();
  const job = await getJob(params.id);
  if (!job) notFound();
  const session = await auth();
  const me = session?.user;
  const employer = job.employerId as any;
  const isOwner = me?.id === employer?._id?.toString();
  if (job.status !== 'active' && !isOwner && me?.role !== 'admin') notFound();

  const [hired, applied, student, reviews] = await Promise.all([
    hiredCount(employer._id.toString()),
    me?.role === 'student' ? Application.findOne({ jobId: job._id, studentId: me.id }, 'status').lean() : null,
    me?.role === 'student' ? User.findById(me.id, 'name school course phone').lean() : null,
    Review.find({ toUserId: employer._id, visible: true, direction: 'student_to_employer' }).sort({ createdAt: -1 }).limit(3).lean(),
  ]);

  const employerName: string = employer.companyName || employer.name;
  const timeMatch = job.schedule.match(/\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2}/);
  const days = timeMatch ? job.schedule.replace(timeMatch[0], '').trim().replace(/[,·]$/, '') : job.schedule;

  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <Link href="/" className="icon-btn" aria-label="Буцах">
          <ChevronLeft size={20} />
        </Link>
        <ReportButton jobId={job._id.toString()} loggedIn={Boolean(me)} />
      </div>

      {job.status !== 'active' && (
        <p className="card-green px-4 py-3 text-sm">
          Төлөв: <b>{JOB_STATUS[job.status as keyof typeof JOB_STATUS]}</b>
          {job.rejectReason && <> — {job.rejectReason}</>}
        </p>
      )}

      <div className="flex items-center gap-4">
        <Avatar name={employerName} size="lg" />
        <div className="min-w-0">
          <h1 className="h-display text-xl leading-tight">{job.title}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted">
            {employerName}
            {employer.verified && <Verified />}
            <Rating avg={employer.ratingAvg} count={employer.ratingCount} />
          </p>
        </div>
      </div>

      <div className="card-green flex items-center justify-between gap-3 p-5">
        <div>
          <p className="text-sm text-muted">Цалин</p>
          <Pay amount={job.payAmount} unit={job.payUnit as PayUnit} size="xl" />
        </div>
        {job.isUrgent && <UrgentBadge />}
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <Info icon={<CalendarDays size={18} />} label="Хуваарь" value={days || '—'} />
        <Info icon={<Clock size={18} />} label="Цаг" value={timeMatch ? timeMatch[0] : '—'} />
        <Info icon={<MapPin size={18} />} label="Байршил" value={job.address ? `${job.district}, ${job.address}` : job.district} />
      </div>

      {job.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {(job.tags as JobTag[]).map((t) => (
            <span key={t} className="chip min-h-[32px]">
              {TAGS[t]}
            </span>
          ))}
        </div>
      )}

      <section>
        <h2 className="mb-2 font-bold">Хийх ажил</h2>
        <p className="whitespace-pre-line text-[15px] leading-relaxed text-soft">{job.description}</p>
      </section>

      {job.requirements?.length > 0 && (
        <section>
          <h2 className="mb-2 font-bold">Шаардлага</h2>
          <div className="flex flex-wrap gap-2">
            {job.requirements.map((r: string) => (
              <span key={r} className="rounded-btn border border-line px-3 py-2 text-sm text-soft">
                {r}
              </span>
            ))}
          </div>
        </section>
      )}

      <JobMap
        district={job.district}
        address={job.address ?? undefined}
        mapUrl={job.mapUrl ?? undefined}
        lat={job.location?.lat ?? undefined}
        lng={job.location?.lng ?? undefined}
      />

      <div className="card flex items-center gap-3 p-4 text-sm text-soft">
        <ShieldCheck size={20} className={employer.verified ? 'text-accent' : 'text-muted'} />
        {employer.verified ? 'Баталгаажсан ажил олгогч' : 'Баталгаажаагүй ажил олгогч'} · {hired} оюутан ажилласан
      </div>

      {reviews.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="font-bold">Оюутнуудын сэтгэгдэл</h2>
          {reviews.map((r) => (
            <div key={r._id.toString()} className="card p-4">
              <div className="flex items-center gap-1 text-star">
                {Array.from({ length: r.stars }).map((_, i) => (
                  <Star key={i} size={14} fill="currentColor" />
                ))}
              </div>
              {r.tags.length > 0 && <p className="mt-2 text-xs text-green-soft">{r.tags.join(' · ')}</p>}
              {r.comment && <p className="mt-1.5 text-sm text-soft">{r.comment}</p>}
            </div>
          ))}
        </section>
      )}

      <div className="safe-bottom fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-lg">
          {isOwner ? (
            <Link href={`/employer/jobs/${job._id}`} className="btn-primary w-full">
              Өргөдлүүдийг харах
            </Link>
          ) : !me ? (
            <Link href={`/login?callbackUrl=/jobs/${job._id}`} className="btn-primary w-full">
              Нэвтэрч өргөдөл илгээх
            </Link>
          ) : me.role !== 'student' ? (
            <p className="py-3 text-center text-sm text-muted">Зөвхөн оюутан өргөдөл илгээнэ</p>
          ) : applied ? (
            <Link href="/me/applications" className="btn-ghost w-full">
              Өргөдөл илгээсэн · Төлөв харах
            </Link>
          ) : (
            <ApplySheet
              job={{
                id: job._id.toString(),
                title: job.title,
                employer: employerName,
                schedule: job.schedule,
                payAmount: job.payAmount,
                payUnit: job.payUnit as PayUnit,
              }}
              me={{
                name: student?.name ?? '',
                school: student?.school ?? '',
                course: student?.course ?? null,
                phone: student?.phone ?? '',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card p-3.5">
      <span className="text-accent">{icon}</span>
      <p className="mt-2 text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-semibold leading-snug">{value}</p>
    </div>
  );
}
