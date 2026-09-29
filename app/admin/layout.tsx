import { pageUser } from '@/lib/guards';
import { Job, Payment, Report } from '@/models';
import { Logo } from '@/components/ui';
import { BottomNav } from '@/components/Nav';
import { AdminTabs } from '@/components/admin/AdminTabs';
import { SignOutButton } from '@/components/SignOutButton';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await pageUser(['admin']);
  const [pending, reports, payments] = await Promise.all([
    Job.countDocuments({ status: 'pending' }),
    Report.countDocuments({ resolved: false }),
    Payment.countDocuments({ status: 'pending' }),
  ]);
  return (
    <>
      <main className="pb-nav mx-auto max-w-5xl space-y-5 px-4 pt-5">
        <div className="flex items-center justify-between">
          <Logo sub="Админ" href="/admin" />
          <SignOutButton compact />
        </div>
        <AdminTabs pending={pending} reports={reports} payments={payments} />
        {children}
      </main>
      <BottomNav role={me.role} loggedIn />
    </>
  );
}
