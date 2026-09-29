'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

export function AdminTabs({ pending, reports }: { pending: number; reports: number }) {
  const p = usePathname();
  const tabs = [
    { href: '/admin', label: 'Хүлээгдэж буй', n: pending },
    { href: '/admin/jobs', label: 'Бүх зар', n: 0 },
    { href: '/admin/users', label: 'Хэрэглэгчид', n: 0 },
    { href: '/admin/reports', label: 'Гомдол', n: reports },
  ];
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className={clsx('chip gap-2', p === t.href && 'chip-active')}>
          {t.label}
          {t.n > 0 && <span className={clsx('badge', p === t.href ? 'bg-accent-ink text-accent' : 'bg-accent text-accent-ink')}>{t.n}</span>}
        </Link>
      ))}
    </div>
  );
}
