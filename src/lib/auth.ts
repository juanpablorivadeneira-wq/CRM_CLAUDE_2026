import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  totpCode: z.string().optional(),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db) as any,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
        totpCode: { label: 'Código 2FA', type: 'text' },
        orgSlug: { label: 'Organización', type: 'text' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password, totpCode } = parsed.data;

        const user = await db.user.findFirst({
          where: {
            email,
            status: 'active',
            org: { status: 'active' },
          },
          include: { org: true },
        });

        if (!user) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        // 2FA: si está activado, exigir código TOTP
        if (user.twoFactorEnabled) {
          if (!totpCode) {
            // Señal especial al cliente para mostrar campo de 2FA
            throw new Error('2FA_REQUIRED');
          }
          const { authenticator } = await import('otplib');
          if (!user.twoFactorSecret) return null;
          const isValid = authenticator.verify({
            token: totpCode,
            secret: user.twoFactorSecret,
          });
          if (!isValid) throw new Error('INVALID_2FA_CODE');
        }

        // Registrar último login
        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
          orgId: user.orgId,
          orgSlug: user.org.slug,
          orgName: user.org.name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
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
});
