import { auth } from '@/auth';
import { dbConnect } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Vercel-ийн функцийн хугацаанаас өмнө хаагдана; EventSource автоматаар дахин холбогдоно
export const maxDuration = 60;
const LIFETIME_MS = 50_000;

type Change = {
  operationType: string;
  ns?: { coll?: string };
  fullDocument?: Record<string, unknown> | null;
};

const idEq = (v: unknown, id: string) => v != null && String(v) === id;

/**
 * Realtime: MongoDB Change Stream-ээр DB-ийн өөрчлөлтийг сонсож, тухайн хэрэглэгчид
 * хамаатай өөрчлөлт гармагц Server-Sent Event илгээнэ → client шууд router.refresh() хийнэ.
 */
export async function GET(req: Request) {
  const session = await auth();
  const me = session?.user;
  const conn = await dbConnect();
  const db = conn.connection.db;
  if (!db) return new Response('db unavailable', { status: 503 });

  const colls = ['jobs', 'notifications', 'applications', 'messages', 'payments', 'reports', 'reviews'];
  const encoder = new TextEncoder();
  let closed = false;

  const relevant = (c: Change) => {
    const coll = c.ns?.coll ?? '';
    const d = c.fullDocument ?? {};
    // Зарын өөрчлөлт: бүх хэрэглэгчийн жагсаалт/дэлгэрэнгүйд нөлөөлнө
    if (coll === 'jobs') return true;
    if (!me?.id) return false;
    if (me.role === 'admin' && ['jobs', 'payments', 'reports'].includes(coll)) return true;
    switch (coll) {
      case 'notifications':
        return idEq(d.userId, me.id);
      case 'applications':
        return idEq(d.studentId, me.id) || idEq(d.employerId, me.id);
      case 'messages':
        return idEq(d.toUserId, me.id) || idEq(d.fromUserId, me.id);
      case 'payments':
        return idEq(d.employerId, me.id);
      case 'reviews':
        return idEq(d.toUserId, me.id) || idEq(d.fromUserId, me.id);
      default:
        return false;
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (s: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(s));
        } catch {
          closed = true;
        }
      };
      // Тасарвал 1 секундын дараа дахин холбогдохыг browser-т хэлнэ
      send('retry: 1000\n\n');
      send('event: ready\ndata: 1\n\n');

      let pending: ReturnType<typeof setTimeout> | null = null;
      const fire = () => {
        if (pending) return;
        // Олон өөрчлөлт зэрэг ирвэл нэг дохио болгож нэгтгэнэ
        pending = setTimeout(() => {
          pending = null;
          send(`event: change\ndata: ${Date.now()}\n\n`);
        }, 150);
      };

      const changeStream = db.watch(
        [{ $match: { operationType: { $in: ['insert', 'update', 'replace', 'delete'] }, 'ns.coll': { $in: colls } } }],
        { fullDocument: 'updateLookup' },
      );
      changeStream.on('change', (c: Change) => {
        if (relevant(c)) fire();
      });
      changeStream.on('error', () => finish());

      // Proxy-ууд холболтыг таслахгүйн тулд 20 секунд тутам ping
      const ping = setInterval(() => send(': ping\n\n'), 20_000);
      const timer = setTimeout(() => finish(), LIFETIME_MS);

      function finish() {
        if (closed) return;
        closed = true;
        clearInterval(ping);
        clearTimeout(timer);
        if (pending) clearTimeout(pending);
        changeStream.close().catch(() => {});
        try {
          controller.close();
        } catch {}
      }
      req.signal.addEventListener('abort', finish);
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
