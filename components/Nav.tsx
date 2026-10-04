'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Bell, Briefcase, FileText, Home, LayoutGrid, MapPin, Plus, Shield, User, CreditCard } from 'lucide-react';

/** Уншаагүй мэдэгдлийн тоо: хуудас нээгдэх үед болон 30 секунд тутам шалгана. */
export function useUnreadCount() {
  const { status } = useSession();
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (status !== 'authenticated') return;
    let alive = true;
    const load = () =>
      fetch('/api/notifications/count', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => alive && setCount(d.count ?? 0))
        .catch(() => {});
    load();
    const t = setInterval(load, 30_000);
    const onVis = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('notifications:changed', load);
    return () => {
      alive = false;
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('notifications:changed', load);
    };
  }, [status, pathname]);
  return count;
}

export function BellButton({ href = '/notifications' }: { href?: string }) {
  const count = useUnreadCount();
  const { status } = useSession();
  if (status !== 'authenticated') return null;
  return (
    <Link href={href} className="icon-btn relative" aria-label={`Мэдэгдэл${count ? `, ${count} уншаагүй` : ''}`}>
      <Bell size={20} />
      {count > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-accent-ink">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}

type Item = { href: string; label: string; icon: React.ElementType; match?: (p: string) => boolean; badge?: boolean };

function itemsFor(role: string | null | undefined): Item[] {
  if (role === 'employer') {
    return [
      { href: '/employer', label: 'Самбар', icon: LayoutGrid, match: (p) => p === '/employer' },
      { href: '/employer/jobs', label: 'Зарууд', icon: FileText, match: (p) => p.startsWith('/employer/jobs') && !p.endsWith('/new') },
      { href: '/employer/jobs/new', label: 'Зар нэмэх', icon: Plus, match: (p) => p === '/employer/jobs/new' },
      { href: '/notifications', label: 'Мэдэгдэл', icon: Bell, badge: true },
      { href: '/employer/profile', label: 'Профайл', icon: User },
    ];
  }
  if (role === 'admin') {
    return [
      { href: '/', label: 'Нүүр', icon: Home, match: (p) => p === '/' },
      { href: '/admin', label: 'Админ', icon: Shield, match: (p) => p.startsWith('/admin') },
      { href: '/notifications', label: 'Мэдэгдэл', icon: Bell, badge: true },
    ];
  }
  return [
    { href: '/', label: 'Нүүр', icon: Home, match: (p) => p === '/' || p.startsWith('/jobs') },
    { href: '/map', label: 'Газрын зураг', icon: MapPin },
    { href: '/me/applications', label: 'Өргөдөл', icon: FileText },
    { href: '/notifications', label: 'Мэдэгдэл', icon: Bell, badge: true },
    { href: '/me/profile', label: 'Профайл', icon: User },
  ];
}

/** role-ийг server layout-аас дамжуулна (hydration mismatch-аас сэргийлнэ). */
export function BottomNav({ className, role, loggedIn }: { className?: string; role: string | null; loggedIn: boolean }) {
  const pathname = usePathname();
  const count = useUnreadCount();
  const items: Item[] = loggedIn ? itemsFor(role) : [
    { href: '/', label: 'Нүүр', icon: Home, match: (p: string) => p === '/' || p.startsWith('/jobs') },
    { href: '/map', label: 'Газрын зураг', icon: MapPin },
    { href: '/login', label: 'Нэвтрэх', icon: User },
  ];
  return (
    <nav className={clsx('safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur', className)}>
      <ul className="mx-auto flex max-w-lg">
        {items.map((it) => {
          const active = it.match ? it.match(pathname) : pathname.startsWith(it.href);
          const Icon = it.icon;
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                className={clsx('relative flex min-h-[64px] flex-col items-center justify-center gap-1 text-[11px]', active ? 'font-bold text-accent' : 'text-muted')}
              >
                <span className="relative">
                  <Icon size={22} />
                  {it.badge && count > 0 && <span className="absolute -right-1 -top-0.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-bg" />}
                </span>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function EmployerSidebar({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname();
  const count = useUnreadCount();
  const links: Item[] = [
    { href: '/employer', label: 'Самбар', icon: LayoutGrid, match: (p) => p === '/employer' },
    { href: '/employer/jobs', label: 'Миний зарууд', icon: FileText, match: (p) => p.startsWith('/employer/jobs') && p !== '/employer/jobs/new' },
    { href: '/employer/applications', label: 'Өргөдлүүд', icon: Briefcase },
    { href: '/notifications', label: 'Мэдэгдэл', icon: Bell },
    { href: '/employer/billing', label: 'Төлбөр', icon: CreditCard },
    { href: '/employer/profile', label: 'Профайл', icon: User },
  ];
  return (
    <ul className="space-y-1.5">
      {links.map((l) => {
        const active = l.match ? l.match(pathname) : pathname.startsWith(l.href);
        const Icon = l.icon;
        const n = l.href === '/employer/applications' ? pendingCount : l.href === '/notifications' ? count : 0;
        return (
          <li key={l.href}>
            <Link
              href={l.href}
              className={clsx(
                'flex min-h-[48px] items-center gap-3 rounded-btn px-4 text-[15px] transition-colors',
                active ? 'border border-line bg-surface font-bold text-text' : 'text-soft hover:bg-surface',
              )}
            >
              <Icon size={20} className={active ? 'text-accent' : 'text-muted'} />
              <span className="flex-1">{l.label}</span>
              {n > 0 && <span className="badge bg-accent text-accent-ink">{n}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
