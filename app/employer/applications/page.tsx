import Link from 'next/link';
import clsx from 'clsx';
import { Inbox } from 'lucide-react';
import { pageUser } from '@/lib/guards';
import { loadApplicants, markViewed } from '@/lib/employer';
import type { AppStatus } from '@/lib/config';
import { EmptyState } from '@/components/ui';
import { ApplicantList } from '@/components/employer/Applicants';

export const metadata = { title: 'Өргөдлүүд' };
export const dynamic = 'force-dynamic';

const TABS: { key: string; label: string; statuses: AppStatus[] }[] = [
  { key: 'new', label: 'Шинэ', statuses: ['sent', 'viewed'] },
  { key: 'invited', label: 'Урьсан', statuses: ['invited'] },
  { key: 'hired', label: 'Ажилд авсан', statuses: ['hired'] },
  { key: 'done', label: 'Дууссан', statuses: ['completed'] },
  { key: 'rejected', label: 'Татгалзсан', statuses: ['rejected'] },
];

export default async function EmployerApplications(props: { searchParams: Promise<{ tab?: string }> }) {
  const searchParams = await props.searchParams;
  const me = await pageUser(['employer']);
  const tab = TABS.find((t) => t.key === searchParams.tab) ?? TABS[0];
  if (tab.key === 'new') await markViewed(me.id);
  const items = await loadApplicants(me.id, { statuses: tab.statuses });

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <h1 className="h-display text-2xl">Өргөдлүүд</h1>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        {TABS.map((t) => (
          <Link key={t.key} href={`/employer/applications?tab=${t.key}`} className={clsx('chip', t.key === tab.key && 'chip-active')}>
            {t.label}
          </Link>
        ))}
      </div>
      {items.length === 0 ? <EmptyState icon={<Inbox size={22} />} title="Өргөдөл алга" /> : <ApplicantList items={items} showJob />}
    </div>
  );
}
