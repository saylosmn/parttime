import Link from 'next/link';
import clsx from 'clsx';
import { Search, SlidersHorizontal, SearchX } from 'lucide-react';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/db';
import { searchJobs } from '@/lib/queries';
import { User } from '@/models';
import { DISTRICTS } from '@/lib/config';
import { Logo, EmptyState } from '@/components/ui';
import { BellButton } from '@/components/Nav';
import { JobRow, FeaturedCard } from '@/components/JobCard';
import { InstallBanner } from '@/components/Pwa';

export const dynamic = 'force-dynamic';

type SP = { q?: string; tag?: string; district?: string; minPay?: string; near?: string };

export default async function HomePage({ searchParams }: { searchParams: SP }) {
  const session = await auth();
  await dbConnect();

  let myDistrict: string | undefined;
  let firstName = '';
  if (session?.user?.id) {
    const me = await User.findById(session.user.id, 'name district companyDistrict').lean();
    myDistrict = me?.district || me?.companyDistrict || undefined;
    firstName = (me?.name || '').split(' ')[0];
  }

  const near = searchParams.near === '1';
  const district = near ? myDistrict : searchParams.district;
  const jobs = await searchJobs({ ...searchParams, district });
  const highlighted = jobs.filter((j) => j.isUrgent || j.isFeatured).slice(0, 3);
  const rest = jobs.filter((j) => !highlighted.includes(j));
  const filtered = Boolean(searchParams.q || searchParams.tag || searchParams.district || searchParams.minPay || near);

  const href = (patch: Partial<SP>) => {
    const p = new URLSearchParams();
    const merged = { q: searchParams.q, ...patch };
    Object.entries(merged).forEach(([k, v]) => v && p.set(k, v));
    const s = p.toString();
    return s ? `/?${s}` : '/';
  };

  const chips: { label: string; href: string; active: boolean }[] = [
    { label: 'Бүгд', href: href({}), active: !searchParams.tag && !near && !searchParams.district && !searchParams.minPay },
    { label: 'Амралтын өдөр', href: href({ tag: 'weekend' }), active: searchParams.tag === 'weekend' },
    { label: 'Орой', href: href({ tag: 'evening' }), active: searchParams.tag === 'evening' },
    {
      label: 'Ойрхон',
      href: session ? (myDistrict ? href({ near: '1' }) : '/me/profile') : '/login',
      active: near,
    },
    { label: 'Туршлагагүй', href: href({ tag: 'no_experience' }), active: searchParams.tag === 'no_experience' },
    { label: 'Зайнаас', href: href({ tag: 'remote' }), active: searchParams.tag === 'remote' },
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-2">
          {!session && (
            <Link href="/login" className="btn-ghost">
              Нэвтрэх
            </Link>
          )}
          <BellButton />
        </div>
      </header>

      <section>
        {firstName && <p className="text-sm text-muted">Сайн уу, {firstName}</p>}
        <h1 className="h-display mt-1 text-[28px] leading-[1.15]">
          Хичээлийнхээ хажуугаар <span className="text-accent">цалинтай</span> ажил ол
        </h1>
      </section>

      <form action="/" className="space-y-3">
        {searchParams.tag && <input type="hidden" name="tag" value={searchParams.tag} />}
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={searchParams.q} placeholder="Ажил, байгууллага хайх" className="input pl-11 pr-14" aria-label="Хайх" />
          <details className="group absolute right-1.5 top-1/2 -translate-y-1/2">
            <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-[10px] bg-surface-2 text-soft" aria-label="Шүүлтүүр">
              <SlidersHorizontal size={18} />
            </summary>
            <div className="card absolute right-0 top-11 z-30 w-72 space-y-3 p-4">
              <label className="block">
                <span className="label">Дүүрэг</span>
                <select name="district" defaultValue={searchParams.district ?? ''} className="input">
                  <option value="">Бүх дүүрэг</option>
                  {DISTRICTS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label">Цалингийн доод хэмжээ (₮)</span>
                <input name="minPay" type="number" min={0} step={1000} inputMode="numeric" defaultValue={searchParams.minPay} placeholder="Жишээ нь: 8000" className="input" />
              </label>
              <button className="btn-primary w-full">Шүүх</button>
            </div>
          </details>
        </div>
      </form>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {chips.map((c) => (
          <Link key={c.label} href={c.href} className={clsx('chip', c.active && 'chip-active')}>
            {c.label}
          </Link>
        ))}
      </div>

      {!session && <InstallBanner />}

      {highlighted.length > 0 && (
        <section className="space-y-3">
          {highlighted.map((j) => (
            <FeaturedCard key={j._id} job={j} />
          ))}
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{filtered ? 'Хайлтын үр дүн' : 'Шинэ зарууд'}</h2>
          {filtered && (
            <Link href="/" className="text-sm font-semibold text-accent">
              Цэвэрлэх
            </Link>
          )}
        </div>
        {rest.length === 0 && highlighted.length === 0 ? (
          <EmptyState icon={<SearchX size={22} />} title="Зар олдсонгүй" body="Шүүлтүүрээ өөрчлөөд дахин оролдоно уу." />
        ) : (
          rest.map((j) => <JobRow key={j._id} job={j} />)
        )}
      </section>
    </div>
  );
}
