import type { Metadata, Viewport } from 'next';
import { Manrope, Unbounded } from 'next/font/google';
import './globals.css';
import { APP_NAME, APP_TAGLINE } from '@/lib/config';
import { Providers } from '@/components/Providers';
import { auth } from '@/auth';

const display = Unbounded({ subsets: ['latin', 'cyrillic'], weight: ['600', '700'], variable: '--font-display' });
const sans = Manrope({ subsets: ['latin', 'cyrillic'], weight: ['400', '500', '600', '700'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: { default: `${APP_NAME} — ${APP_TAGLINE}`, template: `%s · ${APP_NAME}` },
  description: 'Цалин, цаг, байршил нь тодорхой part-time ажлууд. Нэг товчоор өргөдөл илгээ.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: 'black-translucent' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  themeColor: '#0A0F0B',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Server-ээс session дамжуулснаар нэвтэрсний дараа nav шууд шинэчлэгдэнэ
  const session = await auth();
  return (
    <html lang="mn" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-dvh antialiased">
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
