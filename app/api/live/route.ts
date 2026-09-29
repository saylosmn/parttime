import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/db';
import { Application, Job, Notification, Report } from '@/models';

export const dynamic = 'force-dynamic';

const ts = (d?: { updatedAt?: Date; createdAt?: Date } | null) => (d ? new Date(d.updatedAt ?? d.createdAt ?? 0).getTime() : 0);

/**
 * Хуудсыг "realtime" шинэчлэхэд ашиглах хөнгөн хувилбарын тэмдэг.
 * Хэрэглэгчид хамаатай өгөгдөл өөрчлөгдөхөд `v` өөрчлөгдөнө — client тэр үед л router.refresh() хийнэ.
 */
export async function GET() {
  await dbConnect();
  const session = await auth();
  const me = session?.user;

  const parts: (number | string)[] = [];
  // Нийтийн: хамгийн сүүлд өөрчлөгдсөн зар (жагсаалт, дэлгэрэнгүй)
  parts.push(ts(await Job.findOne({}, 'updatedAt').sort({ updatedAt: -1 }).lean()));

  if (me?.id) {
    const [notif, unread, app] = await Promise.all([
      Notification.findOne({ userId: me.id }, 'createdAt').sort({ createdAt: -1 }).lean(),
      Notification.countDocuments({ userId: me.id, read: false }),
      Application.findOne({ $or: [{ studentId: me.id }, { employerId: me.id }] }, 'updatedAt').sort({ updatedAt: -1 }).lean(),
    ]);
    parts.push(ts(notif), unread, ts(app));
    if (me.role === 'admin') {
      const [pending, reports] = await Promise.all([Job.countDocuments({ status: 'pending' }), Report.countDocuments({ resolved: false })]);
      parts.push(pending, reports);
    }
    return NextResponse.json({ v: parts.join('.'), unread }, { headers: { 'Cache-Control': 'no-store' } });
  }
  return NextResponse.json({ v: parts.join('.'), unread: 0 }, { headers: { 'Cache-Control': 'no-store' } });
}
