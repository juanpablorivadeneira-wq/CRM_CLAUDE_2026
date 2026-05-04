'use server';

import { z } from 'zod';
import { add } from 'date-fns';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { seedSystemRoles } from '@/lib/permissions';
import { logger } from '@/lib/logger';

const onboardingSchema = z.object({
  orgName: z.string().min(2, 'Mínimo 2 caracteres').max(80),
  orgSlug: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .max(40, 'Máximo 40 caracteres')
    .regex(/^[a-z][a-z0-9-]*$/, 'Solo minúsculas, números y guiones, comenzando por letra'),
  adminName: z.string().min(2),
  adminEmail: z.string().email(),
  adminPassword: z
    .string()
    .min(10, 'Mínimo 10 caracteres')
    .regex(/[A-Z]/, 'Al menos una mayúscula')
    .regex(/[a-z]/, 'Al menos una minúscula')
    .regex(/[0-9]/, 'Al menos un número'),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'Debes aceptar los términos' }) }),
});

const RESERVED_SLUGS = new Set([
  'system', 'admin', 'app', 'www', 'api', 'auth', 'login', 'onboarding',
  'super-admin', 'settings', 'help', 'support', 'docs', 'public', 'static',
]);

type OnboardingValues = z.infer<typeof onboardingSchema>;

export async function createOrganization(
  data: OnboardingValues,
): Promise<{ ok: boolean; error?: string; orgSlug?: string }> {
  const parsed = onboardingSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Datos inválidos' };
  }

  const { orgName, orgSlug, adminName, adminEmail, adminPassword } = parsed.data;

  if (RESERVED_SLUGS.has(orgSlug)) {
    return { ok: false, error: 'Ese subdominio está reservado, elige otro.' };
  }

  // Verificar slug único
  const existing = await db.organization.findUnique({ where: { slug: orgSlug } });
  if (existing) {
    return { ok: false, error: 'Ese subdominio ya está en uso.' };
  }

  try {
    const passwordHash = await hashPassword(adminPassword);

    // Crear org + roles + primer usuario en una transacción
    const org = await db.organization.create({
      data: {
        slug: orgSlug,
        name: orgName,
        plan: 'trial',
        status: 'active',
        trialEndsAt: add(new Date(), { days: 14 }),
        maxUsers: 5,
        maxProjects: 3,
        aiEnabled: false,
      },
    });

    // Roles del sistema con sus permisos
    const roleIds = await seedSystemRoles(org.id);

    // Primer usuario = Superadmin
    await db.user.create({
      data: {
        orgId: org.id,
        email: adminEmail.toLowerCase(),
        passwordHash,
        name: adminName,
        status: 'active',
        emailVerifiedAt: new Date(), // auto-verificado en onboarding (fase 1)
      },
    });

    // Audit log: creación de organización
    await db.auditLog.create({
      data: {
        orgId: org.id,
        action: 'create',
        module: 'organization',
        entityId: org.id,
        entityType: 'Organization',
        actorType: 'system',
        after: { name: orgName, slug: orgSlug, plan: 'trial' },
      },
    });

    logger.info({ orgId: org.id, slug: orgSlug }, 'New organization created');
    return { ok: true, orgSlug: org.slug };
  } catch (err: any) {
    logger.error(err, 'Failed to create organization');
    return { ok: false, error: 'Error al crear la organización. Intenta de nuevo.' };
  }
}

export async function checkSlugAvailability(slug: string): Promise<{ available: boolean }> {
  if (!/^[a-z][a-z0-9-]{2,39}$/.test(slug)) return { available: false };
  if (RESERVED_SLUGS.has(slug)) return { available: false };
  const existing = await db.organization.findUnique({ where: { slug } });
  return { available: !existing };
}
