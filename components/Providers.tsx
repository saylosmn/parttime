'use client';

import { SessionProvider } from 'next-auth/react';
import { useEffect } from 'react';
import type { Session } from 'next-auth';
import { LiveRefresh } from './LiveRefresh';
import { Toaster } from './Toast';

export function Providers({ children, session }: { children: React.ReactNode; session: Session | null }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    }
  }, []);
  return (
    <SessionProvider session={session} key={session?.user?.id ?? 'anon'}>
      <LiveRefresh />
      {children}
      <Toaster />
    </SessionProvider>
  );
}
