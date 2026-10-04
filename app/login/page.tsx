import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, signIn, devLoginEnabled } from '@/auth';
import { dbConnect } from '@/lib/db';
import { User } from '@/models';
import { Logo } from '@/components/ui';

export const metadata = { title: 'Нэвтрэх' };

const SAMPLES = [
  { i: 'ТК', t: 'Бармены туслах', s: 'СБД · Бя, Ня', p: '8,000₮', r: '-rotate-3' },
  { i: 'ЭА', t: 'Эвентийн туслах', s: 'ХУД · Бямба', p: '60,000₮', r: 'rotate-2 translate-x-8' },
  { i: 'СТ', t: 'Туслах багш', s: 'ЧД · Орой', p: '15,000₮', r: '-rotate-1 translate-x-4' },
];

export default async function LoginPage(props: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const searchParams = await props.searchParams;
  const session = await auth();
  const callbackUrl = searchParams.callbackUrl?.startsWith('/') ? searchParams.callbackUrl : '/';
  if (session?.user) redirect(session.user.onboarded ? callbackUrl : '/onboarding');
  let seedUsers: { email: string; label: string }[] = [];
  if (devLoginEnabled) {
    await dbConnect();
    seedUsers = (await User.find({ email: /@seed\.tsag\.mn$/ }, 'email name companyName role').lean()).map((u) => ({
      email: u.email,
      label: `${u.companyName || u.name} · ${u.role === 'employer' ? 'ажил олгогч' : 'оюутан'}`,
    }));
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-8 pt-6">
      <Logo />
      <div className="mt-10 space-y-4" aria-hidden>
        {SAMPLES.map((s) => (
          <div key={s.t} className={`card flex w-[86%] items-center gap-3 p-4 ${s.r}`}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-green-line bg-green-bg text-sm font-bold text-green-soft">{s.i}</span>
            <div className="flex-1">
              <p className="text-sm font-bold">{s.t}</p>
              <p className="text-xs text-muted">{s.s}</p>
            </div>
            <p className="font-display text-sm font-bold text-accent">{s.p}</p>
          </div>
        ))}
      </div>

      <h1 className="h-display mt-12 text-[28px] leading-[1.15]">
        Хичээлийнхээ хажуугаар <span className="text-accent">цалинтай</span> ажил ол
      </h1>
      <p className="mt-3 text-[15px] text-soft">Цалин, цаг, байршил нь тодорхой part-time ажлууд. Нэг товчоор өргөдөл илгээ.</p>

      <div className="mt-auto space-y-3 pt-10">
        <form
          action={async () => {
            'use server';
            await signIn('google', { redirectTo: callbackUrl });
          }}
        >
          <button className="btn-light w-full text-[15px]">
            <GoogleIcon /> Google-ээр үргэлжлүүлэх
          </button>
        </form>
        <Link href="/" className="btn-ghost w-full">
          Нэвтрэлгүйгээр ажлууд үзэх
        </Link>
        {seedUsers.length > 0 && (
          <details className="card p-4 text-sm">
            <summary className="cursor-pointer font-semibold text-urgent">DEV: seed хэрэглэгчээр нэвтрэх</summary>
            <div className="mt-3 space-y-2">
              {seedUsers.map((u) => (
                <form
                  key={u.email}
                  action={async () => {
                    'use server';
                    await signIn('dev', { email: u.email, redirectTo: callbackUrl });
                  }}
                >
                  <button className="btn-ghost w-full justify-start">{u.label}</button>
                </form>
              ))}
            </div>
          </details>
        )}
        <p className="pt-1 text-center text-xs text-muted">Үргэлжлүүлснээр та Үйлчилгээний нөхцөл болон Нууцлалын бодлогыг зөвшөөрнө.</p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
