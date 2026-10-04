import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';
import { ZodError } from 'zod';
import { auth } from '@/auth';
import type { Role } from '@/auth.config';
import { dbConnect } from './db';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** API-д: нэвтэрсэн, зөв role-той эсэхийг шалгана. */
export async function requireUser(roles?: Role[]) {
  const session = await auth();
  if (!session?.user?.id) throw new HttpError(401, 'Нэвтрэх шаардлагатай');
  if (roles && !roles.includes(session.user.role as Role) && session.user.role !== 'admin') {
    throw new HttpError(403, 'Эрх хүрэхгүй байна');
  }
  await dbConnect();
  return session.user;
}

/** Server component хуудсанд. */
export async function pageUser(roles?: Role[]) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  if (!session.user.onboarded) redirect('/onboarding');
  if (roles && !roles.includes(session.user.role as Role) && session.user.role !== 'admin') redirect('/');
  await dbConnect();
  return session.user;
}

export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) {
        return NextResponse.json({ error: e.issues[0]?.message ?? 'Буруу өгөгдөл', issues: e.issues }, { status: 400 });
      }
      // Буруу хэлбэрийн ID (жишээ нь /api/jobs/abc) → 404
      if ((e as { name?: string })?.name === 'CastError') {
        return NextResponse.json({ error: 'Олдсонгүй' }, { status: 404 });
      }
      if ((e as { code?: number })?.code === 11000) {
        return NextResponse.json({ error: 'Давхардсан бичлэг' }, { status: 409 });
      }
      console.error(e);
      return NextResponse.json({ error: 'Серверийн алдаа' }, { status: 500 });
    }
  };
}

export const ok = (data: unknown = { ok: true }, status = 200) => NextResponse.json(data, { status });

export function startOfDay() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
