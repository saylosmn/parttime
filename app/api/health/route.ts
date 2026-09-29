import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Deploy-ийн тохиргоог шалгах. Нууц утга буцаахгүй, зөвхөн байгаа эсэх, алдааны төрлийг харуулна.
export async function GET() {
  const env = Object.fromEntries(
    ['MONGODB_URI', 'AUTH_SECRET', 'AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET', 'NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'CRON_SECRET', 'ADMIN_EMAILS'].map(
      (k) => [k, Boolean(process.env[k])],
    ),
  );
  let db = 'ok';
  try {
    await dbConnect();
  } catch (e) {
    const err = e as { name?: string; code?: string | number; codeName?: string; message?: string };
    // Холболтын мөр, нууц үг агуулж болзошгүй тул message-ээс зөвхөн эхний хэсгийг, URI-гүйгээр авна
    const msg = (err.message ?? '').replace(/mongodb(\+srv)?:\/\/\S+/g, '[uri]').slice(0, 160);
    db = `${err.name ?? 'Error'}${err.codeName ? ` (${err.codeName})` : ''}: ${msg}`;
  }
  return NextResponse.json({ db, env }, { headers: { 'Cache-Control': 'no-store' } });
}
