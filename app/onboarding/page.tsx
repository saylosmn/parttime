import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/db';
import { User } from '@/models';
import { OnboardingForm } from '@/components/forms/OnboardingForm';

export const metadata = { title: 'Бүртгэл' };

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.onboarded) redirect(session.user.role === 'employer' ? '/employer' : '/');
  await dbConnect();
  const user = await User.findById(session.user.id, 'name').lean();
  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 pb-8 pt-5">
      <OnboardingForm defaultName={user?.name ?? ''} />
    </main>
  );
}
