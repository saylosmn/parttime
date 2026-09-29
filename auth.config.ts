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
      // Onboarding болон role-ын шалгалтыг edge-д (хуучирсан token-оор) хийхгүй —
      // server талд pageUser() DB-ээс шинэчилсэн session-оор шалгана.
      return true;
    },
  },
} satisfies NextAuthConfig;
