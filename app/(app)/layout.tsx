import { auth } from '@/auth';
import { BottomNav } from '@/components/Nav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <>
      <main className="pb-nav mx-auto min-h-dvh w-full max-w-lg px-4 pt-4">{children}</main>
      <BottomNav role={session?.user?.role ?? null} loggedIn={Boolean(session?.user)} />
    </>
  );
}
