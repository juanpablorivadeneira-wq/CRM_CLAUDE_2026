import type { NextAuthConfig } from 'next-auth';

/**
 * Configuración mínima de NextAuth compatible con Edge Runtime (middleware).
 * NO incluye providers que usen bcryptjs/argon2/prisma — esos van en auth.ts.
 */
export const authConfig = {
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: { strategy: 'jwt' },
  providers: [], // Los providers reales se añaden en auth.ts
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.orgId = (user as any).orgId;
        token.orgSlug = (user as any).orgSlug;
        token.orgName = (user as any).orgName;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session as any).orgId = token.orgId;
        (session as any).orgSlug = token.orgSlug;
        (session as any).orgName = token.orgName;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
