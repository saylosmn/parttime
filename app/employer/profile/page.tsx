import { pageUser } from '@/lib/guards';
import { User } from '@/models';
import { Avatar, Rating, Verified } from '@/components/ui';
import { InstallRow, PushToggle } from '@/components/Pwa';
import { ProfileEditor } from '@/components/ProfileEditor';
import { SignOutButton } from '@/components/SignOutButton';

export const metadata = { title: 'Профайл' };
export const dynamic = 'force-dynamic';

export default async function EmployerProfile() {
  const me = await pageUser(['employer']);
  const u = await User.findById(me.id).lean();
  if (!u) return null;
  return (
    <div className="mx-auto max-w-xl">
      <ProfileEditor
        role="employer"
        title="Профайл"
        initial={{ name: u.name ?? '', phone: u.phone ?? '', companyName: u.companyName ?? '', companyDistrict: u.companyDistrict ?? '' }}
      >
        <div className="flex items-center gap-4">
          <Avatar name={u.companyName || u.name} size="lg" />
          <div>
            <p className="h-display flex items-center gap-2 text-xl">
              {u.companyName} {u.verified && <Verified />}
            </p>
            <p className="text-sm text-muted">
              {u.name} · {u.companyDistrict}
            </p>
            <Rating avg={u.ratingAvg} count={u.ratingCount} />
          </div>
        </div>
        {!u.verified && (
          <p className="card-green p-4 text-sm text-green-soft">
            Баталгаажсан тэмдэг авахын тулд админтай холбогдож байгууллагын гэрчилгээгээ илгээнэ үү.
          </p>
        )}
        <div className="card divide-y divide-line">
          <div className="flex min-h-[52px] items-center justify-between px-4">
            <span>Утас</span>
            <span className="text-sm text-muted">{u.phone ? `+976 ${u.phone}` : '—'}</span>
          </div>
          <div className="flex min-h-[52px] items-center justify-between px-4">
            <span>Push мэдэгдэл</span>
            <PushToggle />
          </div>
          <InstallRow />
        </div>
        <SignOutButton />
      </ProfileEditor>
    </div>
  );
}
