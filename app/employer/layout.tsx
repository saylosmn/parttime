import Link from 'next/link';
import { Plus } from 'lucide-react';
import { pageUser } from '@/lib/guards';
import { Application } from '@/models';
import { Logo } from '@/components/ui';
import { BottomNav, EmployerSidebar } from '@/components/Nav';

export default async function EmployerLayout({ children }: { children: React.ReactNode }) {
  const me = await pageUser(['employer']);
  const pending = await Application.countDocuments({ employerId: me.id, status: 'sent' });
  return (
    <div className="min-h-dvh lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col border-r border-line p-6 lg:flex">
        <Logo sub="Ажил олгогч" href="/employer" />
        <Link href="/employer/jobs/new" className="btn-primary mt-8 min-h-[52px] text-[15px]">
          <Plus size={18} /> Шинэ зар нэмэх
        </Link>
        <nav className="mt-6">
          <EmployerSidebar pendingCount={pending} />
        </nav>
        <Link href="/employer/billing" className="card-green mt-auto block p-4">
          <p className="font-bold">Онцлох зар</p>
          <p className="mt-1 text-sm text-green-soft">Жагсаалтын дээр гарч, ойр байгаа оюутнуудад мэдэгдэл очно</p>
          <p className="mt-2 text-sm font-bold text-accent">10,000₮ / 7 хоног →</p>
        </Link>
      </aside>
      <main className="pb-nav min-w-0 flex-1 px-4 pt-5 lg:px-10 lg:pb-10 lg:pt-8">{children}</main>
      <BottomNav className="lg:hidden" role={me.role} loggedIn />
    </div>
  );
}
