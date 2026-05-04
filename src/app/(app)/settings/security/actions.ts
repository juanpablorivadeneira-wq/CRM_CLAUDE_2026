'use server';

import { z } from 'zod';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { db } from '@/lib/db';
import { getTenantContext } from '@/lib/tenant';
import { revalidatePath } from 'next/cache';

/**
 * Genera un secret TOTP nuevo y la URL del QR para que el usuario escanee.
 * El secret NO se guarda hasta que el usuario verifique con un código válido.
 */
export async function startTotpSetup(): Promise<{
  secret: string;
  qrDataUrl: string;
  otpauthUrl: string;
}> {
  const ctx = await getTenantContext();
  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(ctx.userEmail, `BK-CRM (${ctx.orgName})`, secret);
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl);
  return { secret, qrDataUrl, otpauthUrl };
}

const verifySchema = z.object({
  secret: z.string(),
  code: z.string().length(6),
});

/**
 * Verifica el código y, si es válido, activa el 2FA y genera códigos de respaldo.
 */
export async function confirmTotpSetup(data: z.infer<typeof verifySchema>): Promise<{
  ok: boolean;
  backupCodes?: string[];
  error?: string;
}> {
  const ctx = await getTenantContext();
  const parsed = verifySchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };

  const valid = authenticator.verify({ token: parsed.data.code, secret: parsed.data.secret });
  if (!valid) return { ok: false, error: 'Código incorrecto. Revisa la hora de tu dispositivo.' };

  // Generar 8 códigos de respaldo de 10 caracteres
  const backupCodes = Array.from({ length: 8 }, () => generateBackupCode());

  // Hash simple de los códigos (en este punto basta con guardarlos uno-vía)
  const { createHash } = await import('node:crypto');
  const hashedCodes = backupCodes.map((c) => createHash('sha256').update(c).digest('hex'));

  await db.user.update({
    where: { id: ctx.userId },
    data: {
      twoFactorEnabled: true,
      twoFactorSecret: parsed.data.secret,
      twoFactorBackupCodes: hashedCodes,
    },
  });

  await db.auditLog.create({
    data: {
      orgId: ctx.orgId,
      action: 'update',
      module: 'users',
      entityType: 'User',
      entityId: ctx.userId,
      actorType: 'human',
      actorId: ctx.userId,
      after: { twoFactorEnabled: true },
    },
  });

  revalidatePath('/settings/security');
  return { ok: true, backupCodes };
}

const disableSchema = z.object({ code: z.string().length(6) });

export async function disableTotp(data: z.infer<typeof disableSchema>): Promise<{
  ok: boolean;
  error?: string;
}> {
  const ctx = await getTenantContext();
  const parsed = disableSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: 'Código requerido' };

  const user = await db.user.findUnique({ where: { id: ctx.userId } });
  if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
    return { ok: false, error: '2FA no está activo' };
  }

  const valid = authenticator.verify({ token: parsed.data.code, secret: user.twoFactorSecret });
  if (!valid) return { ok: false, error: 'Código incorrecto' };

  await db.user.update({
    where: { id: ctx.userId },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: [],
    },
  });

  await db.auditLog.create({
    data: {
      orgId: ctx.orgId,
      action: 'update',
      module: 'users',
      entityType: 'User',
      entityId: ctx.userId,
      actorType: 'human',
      actorId: ctx.userId,
      after: { twoFactorEnabled: false },
    },
  });

  revalidatePath('/settings/security');
  return { ok: true };
}

function generateBackupCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const arr = new Uint8Array(10);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join('');
}
