import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

export type Role = 'student' | 'employer' | 'admin';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: Role | null;
      onboarded: boolean;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

// Edge-д ажиллах хэсэг (middleware). DB-д хандахгүй.
export const authConfig = {
  providers: [Google],
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  trustHost: true,
  callbacks: {
    session({ session, token }) {
      session.user.id = token.uid as string;
      session.user.role = (token.role as Role) ?? null;
      session.user.onboarded = Boolean(token.onboarded);
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const user = auth?.user;
      const needs = (prefix: string) => pathname === prefix || pathname.startsWith(prefix + '/');
      if (needs('/me') || needs('/notifications') || needs('/employer') || needs('/admin') || needs('/onboarding')) {
        if (!user) return false;
      }
      if (user && !user.onboarded && !needs('/onboarding') && !pathname.startsWith('/api') && (needs('/me') || needs('/employer') || needs('/notifications'))) {
        return Response.redirect(new URL('/onboarding', request.nextUrl));
      }
      if (needs('/employer') && user?.role !== 'employer' && user?.role !== 'admin') {
        return Response.redirect(new URL('/', request.nextUrl));
      }
      if (needs('/admin') && user?.role !== 'admin') {
        return Response.redirect(new URL('/', request.nextUrl));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
