import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig, type Role } from './auth.config';
import { dbConnect } from '@/lib/db';
import { User } from '@/models';
import { adminEmails } from '@/lib/config';

async function loadUser(email: string, profile?: { name?: string | null; image?: string | null }) {
  await dbConnect();
  const isAdmin = adminEmails().includes(email.toLowerCase());
  let user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    user = await User.create({
      email,
      name: profile?.name ?? '',
      image: profile?.image ?? undefined,
      role: isAdmin ? 'admin' : null,
      onboarded: isAdmin,
    });
  } else if (isAdmin && user.role !== 'admin') {
    user.role = 'admin';
    user.onboarded = true;
    await user.save();
  }
  return user;
}

/** Local хөгжүүлэлтэд seed хэрэглэгчээр нэвтрэх. Production-д хэзээ ч идэвхжихгүй. */
export const devLoginEnabled = process.env.NODE_ENV !== 'production' && process.env.DEV_LOGIN === 'true';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    ...(devLoginEnabled
      ? [
          Credentials({
            id: 'dev',
            credentials: { email: {} },
            async authorize(c) {
              const email = String(c?.email ?? '').toLowerCase();
              if (!email.endsWith('@seed.tsag.mn')) return null;
              await dbConnect();
              const u = await User.findOne({ email }).lean();
              return u ? { id: u._id.toString(), email: u.email, name: u.name } : null;
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      if (!user.email) return false;
      const u = await loadUser(user.email, { name: user.name, image: user.image });
      return !u.banned;
    },
    async jwt({ token, user, trigger }) {
      // Нэвтрэх үед болон session.update() дуудагдах үед DB-ээс шинэчилнэ
      if (user?.email || trigger === 'update') {
        const email = (user?.email ?? token.email) as string;
        const u = await loadUser(email, { name: user?.name, image: user?.image });
        token.uid = u._id.toString();
        token.role = u.role as Role | null;
        token.onboarded = u.onboarded;
        token.name = u.companyName || u.name;
      }
      return token;
    },
  },
});
