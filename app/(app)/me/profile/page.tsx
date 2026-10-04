import Link from 'next/link';
import { Types } from 'mongoose';
import { pageUser } from '@/lib/guards';
import { Application, Review, User } from '@/models';
import { AVAILABILITY, type Availability } from '@/lib/config';
import { Avatar, Rating } from '@/components/ui';
import { InstallRow, PushToggle } from '@/components/Pwa';
import { ProfileEditor } from '@/components/ProfileEditor';
import { SignOutButton } from '@/components/SignOutButton';
import { JobAlertsSetting } from '@/components/JobAlertsSetting';

export const metadata = { title: 'Профайл' };
export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const me = await pageUser(['student']);
  const [user, counts, tagAgg] = await Promise.all([
    User.findById(me.id).lean(),
    Application.aggregate([{ $match: { studentId: new Types.ObjectId(me.id) } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    Review.aggregate([
      { $match: { toUserId: new Types.ObjectId(me.id), visible: true } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
    ]),
  ]);
  if (!user) return null;
  const c = Object.fromEntries(counts.map((x) => [x._id, x.n])) as Record<string, number>;
  const worked = c.completed ?? 0;
  const activeApps = (c.sent ?? 0) + (c.viewed ?? 0) + (c.invited ?? 0);

  const initial = {
    name: user.name ?? '',
    phone: user.phone ?? '',
    school: user.school ?? '',
    course: user.course ?? 1,
    district: user.district ?? '',
    availability: (user.availability ?? []) as Availability[],
    bio: user.bio ?? '',
  };

  return (
    <div className="space-y-5">
      <ProfileEditor role="student" initial={initial} title="Профайл">
        <div className="flex items-center gap-4">
          <Avatar name={user.name || 'Оюутан'} size="lg" className="border-0 bg-accent text-accent-ink" />
          <div>
            <p className="h-display text-xl">{user.name}</p>
            <p className="text-sm text-muted">
              {user.school} · {user.course}-р курс · {user.district}
            </p>
            <Rating avg={user.ratingAvg} count={user.ratingCount} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <Mini n={worked} l="Ажилласан" />
          <Mini n={activeApps} l="Идэвхтэй өргөдөл" />
          <Mini n={user.ratingCount} l="Үнэлгээ" />
        </div>

        {tagAgg.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-bold">Ажил олгогчдын өгсөн шошго</h2>
            <div className="flex flex-wrap gap-2">
              {tagAgg.map((t) => (
                <span key={t._id} className="badge border border-green-line bg-green-bg py-1.5 text-green-soft">
                  {t._id} · {t.n}
                </span>
              ))}
            </div>
          </section>
        )}

        <div className="card divide-y divide-line text-[15px]">
          <Link href="/me/saved" className="flex min-h-[52px] items-center justify-between gap-4 px-4 hover:bg-surface-2">
            <span>Хадгалсан зарууд</span>
            <span className="text-sm text-muted">{user.savedJobs?.length ?? 0} ›</span>
          </Link>
          <Row k="Чөлөөт цаг" v={(user.availability ?? []).map((a) => AVAILABILITY[a as Availability]).join(', ') || '—'} />
          <Row k="Утас" v={user.phone ? `+976 ${user.phone}` : '—'} />
          <div className="flex min-h-[52px] items-center justify-between px-4">
            <span>Push мэдэгдэл</span>
            <PushToggle />
          </div>
          <JobAlertsSetting initial={(user.jobAlerts as 'all' | 'district' | 'off') ?? 'all'} district={user.district ?? undefined} />
          <InstallRow />
        </div>

        <SignOutButton />
      </ProfileEditor>
    </div>
  );
}

function Mini({ n, l }: { n: number; l: string }) {
  return (
    <div className="card p-3.5">
      <p className="h-display text-2xl">{n}</p>
      <p className="mt-1 text-xs text-muted">{l}</p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-4 px-4">
      <span>{k}</span>
      <span className="text-right text-sm text-muted">{v}</span>
    </div>
  );
}
