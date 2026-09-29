import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/db';
import { Notification } from '@/models';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ count: 0 });
  await dbConnect();
  const count = await Notification.countDocuments({ userId: session.user.id, read: false });
  return NextResponse.json({ count }, { headers: { 'Cache-Control': 'no-store' } });
}
