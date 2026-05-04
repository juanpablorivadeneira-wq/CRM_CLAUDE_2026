import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { z } from 'zod';
import { authConfig } from './auth.config';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  totpCode: z.string().optional(),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db) as any,
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

        if (user.twoFactorEnabled) {
          if (!totpCode) {
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
        } as any;
      },
    }),
  ],
});
