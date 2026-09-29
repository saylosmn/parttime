import { pageUser } from '@/lib/guards';
import { Job, Report } from '@/models';
import { Logo } from '@/components/ui';
import { BottomNav } from '@/components/Nav';
import { AdminTabs } from '@/components/admin/AdminTabs';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await pageUser(['admin']);
  const [pending, reports] = await Promise.all([Job.countDocuments({ status: 'pending' }), Report.countDocuments({ resolved: false })]);
  return (
    <>
      <main className="pb-nav mx-auto max-w-5xl space-y-5 px-4 pt-5">
        <div className="flex items-center justify-between">
          <Logo sub="Админ" href="/admin" />
        </div>
        <AdminTabs pending={pending} reports={reports} />
        {children}
      </main>
      <BottomNav role={me.role} loggedIn />
    </>
  );
}
