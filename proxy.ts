import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

// Next.js 16: middleware.ts → proxy.ts. Нэвтрээгүй хэрэглэгчийг /login руу шилжүүлнэ
// (role/onboarding-ийн шалгалтыг server талд pageUser() хийнэ).
const { auth } = NextAuth(authConfig);
export const proxy = auth;

export const config = {
  matcher: ['/me/:path*', '/notifications', '/employer/:path*', '/admin/:path*', '/onboarding', '/chat/:path*'],
};
