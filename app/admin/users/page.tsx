import { pageUser } from '@/lib/guards';
import Link from 'next/link';
import clsx from 'clsx';
import { User } from '@/models';
import { Avatar, Rating, Verified } from '@/components/ui';
import { UserAdminActions } from '@/components/admin/AdminActions';

export const metadata = { title: 'Хэрэглэгчид' };
export const dynamic = 'force-dynamic';

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default async function AdminUsers({ searchParams }: { searchParams: { role?: string; q?: string } }) {
  await pageUser(['admin']);
  const role = searchParams.role === 'student' ? 'student' : 'employer';
  const q: Record<string, unknown> = { role };
  if (searchParams.q) {
    const rx = new RegExp(escapeRegex(searchParams.q.slice(0, 60)), 'i');
    q.$or = [{ name: rx }, { email: rx }, { companyName: rx }];
  }
  const users = await User.find(q).sort({ createdAt: -1 }).limit(100).lean();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin/users?role=employer" className={clsx('chip', role === 'employer' && 'chip-active')}>
          Ажил олгогч
        </Link>
        <Link href="/admin/users?role=student" className={clsx('chip', role === 'student' && 'chip-active')}>
          Оюутан
        </Link>
        <form className="ml-auto w-full sm:w-64">
          <input type="hidden" name="role" value={role} />
          <input name="q" defaultValue={searchParams.q} className="input" placeholder="Нэр, имэйл хайх" />
        </form>
      </div>
      {users.map((u) => (
        <div key={u._id.toString()} className={clsx('card flex flex-wrap items-center gap-3 p-4', u.banned && 'opacity-60')}>
          <Avatar name={u.companyName || u.name || u.email} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 font-bold">
              {u.companyName || u.name} {u.verified && <Verified />}
              {u.banned && <span className="badge bg-[#2a1212] text-[#F26B6B]">Хаагдсан</span>}
            </p>
            <p className="truncate text-xs text-muted">
              {u.email} {u.phone && `· ${u.phone}`} {u.school && `· ${u.school}`}
            </p>
            <Rating avg={u.ratingAvg} count={u.ratingCount} />
          </div>
          <UserAdminActions id={u._id.toString()} verified={Boolean(u.verified)} banned={Boolean(u.banned)} role={u.role ?? ''} />
        </div>
      ))}
      {users.length === 0 && <p className="text-sm text-muted">Хэрэглэгч олдсонгүй.</p>}
    </div>
  );
}
