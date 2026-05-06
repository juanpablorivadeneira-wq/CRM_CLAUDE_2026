import { PrismaClient, BusinessLine, AiMode, LeadOrigin, OpportunityStatus } from '@prisma/client';
import { hashPassword } from '../src/lib/password';
import { seedSystemRoles } from '../src/lib/permissions';
import { seedClientsForActiveProjects } from '../scripts/seed-clients';

const db = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed BK-CRM...');

  // =========================================================================
  // ORGANIZACIÓN SYSTEM (super-admin global del SaaS)
  // =========================================================================
  const systemOrg = await db.organization.upsert({
    where: { slug: 'system' },
    update: {},
    create: {
      slug: 'system',
      name: 'BK-CRM System',
      plan: 'enterprise',
      status: 'active',
      maxUsers: 5,
      maxProjects: 0,
    },
  });
  await seedSystemRoles(systemOrg.id);
  const sysAdminHash = await hashPassword('SuperAdmin2026!');
  await db.user.upsert({
    where: { orgId_email: { orgId: systemOrg.id, email: 'super@bk-crm.local' } },
    update: {},
    create: {
      orgId: systemOrg.id,
      email: 'super@bk-crm.local',
      passwordHash: sysAdminHash,
      name: 'Super Admin',
      status: 'active',
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`✅ Org SYSTEM creada con super-admin: super@bk-crm.local / SuperAdmin2026!`);

  // =========================================================================
  // ORGANIZACIÓN: ARQUÉTIKA
  // =========================================================================
  const org = await db.organization.upsert({
    where: { slug: 'arquetika' },
    update: {},
    create: {
      slug: 'arquetika',
      name: 'Arquétika',
      plan: 'pro',
      status: 'active',
      primaryColor: '#3F51B5',
      accentColor: '#7E57C2',
      locale: 'es',
      timezone: 'America/Guayaquil',
      maxUsers: 20,
      maxProjects: 10,
      aiEnabled: false,
    },
  });
  console.log(`✅ Organización: ${org.name} (${org.slug})`);

  // =========================================================================
  // ROLES predefinidos
  // =========================================================================
  const roles = await seedSystemRoles(org.id);
  console.log(`✅ Roles + permisos: ${Object.keys(roles).join(', ')}`);

  // =========================================================================
  // USUARIOS
  // =========================================================================
  const superadminHash = await hashPassword('Admin2026!');
  const superadmin = await db.user.upsert({
    where: { orgId_email: { orgId: org.id, email: 'admin@arquetika.com' } },
    update: {},
    create: {
      orgId: org.id,
      email: 'admin@arquetika.com',
      passwordHash: superadminHash,
      name: 'Administrador',
      status: 'active',
      emailVerifiedAt: new Date(),
    },
  });

  const vendedores = [
    { name: 'Juan Morales', email: 'juan.morales@arquetika.com' },
    { name: 'Sofía Castillo', email: 'sofia.castillo@arquetika.com' },
    { name: 'Diego Jiménez', email: 'diego.jimenez@arquetika.com' },
    { name: 'Laura Vargas', email: 'laura.vargas@arquetika.com' },
    { name: 'Mateo Rojas', email: 'mateo.rojas@arquetika.com' },
  ];

  const vendedorIds: string[] = [];
  for (const v of vendedores) {
    const hash = await hashPassword('Vendedor2026!');
    const user = await db.user.upsert({
      where: { orgId_email: { orgId: org.id, email: v.email } },
      update: {},
      create: {
        orgId: org.id,
        email: v.email,
        passwordHash: hash,
        name: v.name,
        status: 'active',
        emailVerifiedAt: new Date(),
        workingHours: {
          mon: { start: '08:00', end: '18:00' },
          tue: { start: '08:00', end: '18:00' },
          wed: { start: '08:00', end: '18:00' },
          thu: { start: '08:00', end: '18:00' },
          fri: { start: '08:00', end: '18:00' },
          sat: { start: '09:00', end: '13:00' },
        },
        appointmentBuffer: 15,
      },
    });
    vendedorIds.push(user.id);
  }
  console.log(`✅ Usuarios: 1 superadmin + ${vendedores.length} vendedores`);

  // =========================================================================
  // TIPOS DE PROYECTO
  // =========================================================================
  const tipoConjunto = await db.projectType.upsert({
    where: { orgId_name: { orgId: org.id, name: 'Conjunto habitacional' } },
    update: {},
    create: {
      orgId: org.id,
      name: 'Conjunto habitacional',
      businessLine: BusinessLine.real_estate,
      description: 'Venta de unidades dentro de un proyecto desarrollado.',
      isSystem: true,
      customFields: [
        { key: 'presupuesto', label: 'Rango de presupuesto', type: 'select', required: true,
          options: ['Menos de $150.000', '$150.000 – $200.000', 'Más de $200.000'] },
        { key: 'tipo_vivienda', label: 'Tipo de vivienda', type: 'select', required: true,
          options: ['Casa terminada', 'Casa en construcción'] },
        { key: 'forma_pago', label: 'Forma de pago', type: 'select', required: true,
          options: ['Contado', 'Crédito hipotecario', 'Mixto'] },
        { key: 'descuento_inmediato', label: 'Interés en descuento por compra inmediata', type: 'select',
          options: ['Sí', 'No'] },
      ],
    },
  });

  const tipoDiseño = await db.projectType.upsert({
    where: { orgId_name: { orgId: org.id, name: 'Diseño' } },
    update: {},
    create: {
      orgId: org.id,
      name: 'Diseño',
      businessLine: BusinessLine.design,
      description: 'Proyectos de diseño arquitectónico e interiorismo.',
      isSystem: true,
      customFields: [
        { key: 'tipo_diseno', label: 'Tipo de diseño', type: 'select', required: true,
          options: ['Interiorismo', 'Arquitectónico', 'Urbanístico', 'Paisajismo'] },
        { key: 'metros_cuadrados', label: 'Metros cuadrados aproximados', type: 'text' },
        { key: 'presupuesto_diseno', label: 'Presupuesto para diseño', type: 'text' },
      ],
    },
  });

  const tipoConstruccion = await db.projectType.upsert({
    where: { orgId_name: { orgId: org.id, name: 'Construcción a la medida' } },
    update: {},
    create: {
      orgId: org.id,
      name: 'Construcción a la medida',
      businessLine: BusinessLine.construction,
      description: 'Viviendas, remodelaciones y obras corporativas.',
      isSystem: true,
      customFields: [
        { key: 'tipo_obra', label: 'Tipo de obra', type: 'select', required: true,
          options: ['Vivienda unifamiliar', 'Remodelación', 'Ampliación', 'Obra corporativa'] },
        { key: 'tiene_terreno', label: '¿Tiene terreno propio?', type: 'select',
          options: ['Sí', 'No'] },
        { key: 'presupuesto_obra', label: 'Presupuesto referencial', type: 'text' },
        { key: 'plazo_inicio', label: 'Plazo esperado de inicio', type: 'text' },
      ],
    },
  });
  console.log(`✅ Tipos de proyecto: Conjunto, Diseño, Construcción`);

  // =========================================================================
  // ETAPAS DE PIPELINE
  // =========================================================================
  const stagesConjunto = [
    { name: 'Lead', order: 1, probability: 5, slaDays: 1 },
    { name: 'Contactado', order: 2, probability: 15, slaDays: 3 },
    { name: 'Visita agendada', order: 3, probability: 30, slaDays: 5 },
    { name: 'Visita realizada', order: 4, probability: 50, slaDays: 7 },
    { name: 'Cotización', order: 5, probability: 65, slaDays: 10 },
    { name: 'Reserva', order: 6, probability: 80, slaDays: 15 },
    { name: 'Promesa firmada', order: 7, probability: 90, slaDays: 30 },
    { name: 'Escrituración', order: 8, probability: 95, slaDays: 60 },
    { name: 'Venta cerrada', order: 9, probability: 100, isWon: true },
    { name: 'Perdido', order: 10, probability: 0, isLost: true },
  ];

  const stagesDiseño = [
    { name: 'Lead', order: 1, probability: 5, slaDays: 1 },
    { name: 'Brief', order: 2, probability: 20, slaDays: 3 },
    { name: 'Propuesta económica', order: 3, probability: 40, slaDays: 5 },
    { name: 'Contrato firmado', order: 4, probability: 75, isWon: false },
    { name: 'Anteproyecto', order: 5, probability: 85 },
    { name: 'Desarrollo', order: 6, probability: 90 },
    { name: 'Entrega final', order: 7, probability: 95 },
    { name: 'Cobrado', order: 8, probability: 100, isWon: true },
    { name: 'Perdido', order: 9, probability: 0, isLost: true },
  ];

  const stagesConstruccion = [
    { name: 'Lead', order: 1, probability: 5, slaDays: 1 },
    { name: 'Visita técnica', order: 2, probability: 15, slaDays: 3 },
    { name: 'Levantamiento', order: 3, probability: 30, slaDays: 7 },
    { name: 'Propuesta técnico-económica', order: 4, probability: 50, slaDays: 14 },
    { name: 'Negociación', order: 5, probability: 65, slaDays: 21 },
    { name: 'Contrato + anticipo', order: 6, probability: 85, isWon: false },
    { name: 'En ejecución', order: 7, probability: 95 },
    { name: 'Cierre y postventa', order: 8, probability: 100, isWon: true },
    { name: 'Perdido', order: 9, probability: 0, isLost: true },
  ];

  for (const [type, stages] of [
    [tipoConjunto, stagesConjunto],
    [tipoDiseño, stagesDiseño],
    [tipoConstruccion, stagesConstruccion],
  ] as const) {
    for (const s of stages) {
      await db.pipelineStage.upsert({
        where: { projectTypeId_order: { projectTypeId: type.id, order: s.order } },
        update: {},
        create: {
          projectTypeId: type.id,
          name: s.name,
          order: s.order,
          probability: s.probability ?? 0,
          slaDays: (s as any).slaDays,
          isWon: (s as any).isWon ?? false,
          isLost: (s as any).isLost ?? false,
        },
      });
    }
  }
  console.log(`✅ Etapas de pipeline creadas`);

  // =========================================================================
  // PROYECTOS
  // =========================================================================
  const stageLeadAranda = await db.pipelineStage.findFirst({
    where: { projectTypeId: tipoConjunto.id, order: 1 },
  });

  const projAranda = await db.project.upsert({
    where: { id: 'proj-aranda' },
    update: {},
    create: {
      id: 'proj-aranda',
      orgId: org.id,
      projectTypeId: tipoConjunto.id,
      businessLine: BusinessLine.real_estate,
      name: 'Proyecto Arandá',
      status: 'active',
      description: 'Exclusivo desarrollo residencial con diseño de autor y amenidades de lujo. Unidades de 2 y 3 recámaras disponibles.',
      imageUrl: 'https://picsum.photos/seed/401/600/400',
      address: 'Av. Principal 123, Ciudad Principal',
      referencePrice: 200000,
      aiMode: AiMode.off,
    },
  });

  const projNuevoHorizonte = await db.project.upsert({
    where: { id: 'proj-nuevo-horizonte' },
    update: {},
    create: {
      id: 'proj-nuevo-horizonte',
      orgId: org.id,
      projectTypeId: tipoConjunto.id,
      businessLine: BusinessLine.real_estate,
      name: 'Residencial Nuevo Horizonte',
      status: 'active',
      description: 'Moderno condominio con áreas verdes y seguridad 24/7. Apartamentos de 1 y 2 habitaciones.',
      imageUrl: 'https://picsum.photos/seed/402/600/400',
      address: 'Calle Ficticia 456, Ciudad Secundaria',
      referencePrice: 185000,
      aiMode: AiMode.off,
    },
  });

  const projDiseñoResidencial = await db.project.upsert({
    where: { id: 'proj-diseno-residencial' },
    update: {},
    create: {
      id: 'proj-diseno-residencial',
      orgId: org.id,
      projectTypeId: tipoDiseño.id,
      businessLine: BusinessLine.design,
      name: 'Servicios de Diseño Residencial',
      status: 'active',
      description: 'Diseño arquitectónico e interiorismo para viviendas particulares.',
      aiMode: AiMode.off,
    },
  });

  const projConstruccionAmedida = await db.project.upsert({
    where: { id: 'proj-construccion-amedida' },
    update: {},
    create: {
      id: 'proj-construccion-amedida',
      orgId: org.id,
      projectTypeId: tipoConstruccion.id,
      businessLine: BusinessLine.construction,
      name: 'Construcción a la Medida',
      status: 'active',
      description: 'Viviendas unifamiliares, remodelaciones y obras corporativas.',
      aiMode: AiMode.off,
    },
  });
  console.log(`✅ Proyectos: Arandá, Nuevo Horizonte, Diseño, Construcción`);

  // Asignar vendedores al proyecto Arandá
  const [juan, sofia, diego] = vendedorIds;
  for (const userId of [superadmin.id, juan, sofia, diego]) {
    const roleId = userId === superadmin.id ? roles['Superadmin'] : roles['Vendedor'];
    await db.userProjectAssignment.upsert({
      where: { userId_projectId: { userId, projectId: projAranda.id } },
      update: {},
      create: { userId, projectId: projAranda.id, roleId },
    });
  }

  // =========================================================================
  // CLIENTES Y OPORTUNIDADES de ejemplo (Arandá)
  // =========================================================================
  if (!stageLeadAranda) {
    console.log('⚠️  Stage lead Arandá no encontrada, saltando oportunidades de ejemplo');
    return;
  }

  const stageContactado = await db.pipelineStage.findFirst({
    where: { projectTypeId: tipoConjunto.id, name: 'Contactado' },
  });
  const stageSeguimiento = await db.pipelineStage.findFirst({
    where: { projectTypeId: tipoConjunto.id, name: 'Visita agendada' },
  });
  const stageVenta = await db.pipelineStage.findFirst({
    where: { projectTypeId: tipoConjunto.id, name: 'Venta cerrada' },
  });

  const clientesEjemplo = [
    {
      name: 'Carlos Hernández', email: 'carlos.h@example.com', phone: '555-1234',
      origin: LeadOrigin.meta_ads, stage: stageContactado ?? stageLeadAranda,
      salespersonIdx: 0, data: { presupuesto: 'Más de $200.000', tipo_vivienda: 'Casa en construcción', forma_pago: 'Contado' },
    },
    {
      name: 'Ana García', email: 'ana.g@example.com', phone: '555-5678',
      origin: LeadOrigin.web_form, stage: stageLeadAranda,
      salespersonIdx: 1, data: { presupuesto: '$150.000 – $200.000', tipo_vivienda: 'Casa terminada', forma_pago: 'Crédito hipotecario' },
    },
    {
      name: 'Sofía Martínez', email: 'sofia.m@example.com', phone: '555-4321',
      origin: LeadOrigin.referral, stage: stageVenta ?? stageLeadAranda,
      salespersonIdx: 1, data: { presupuesto: 'Más de $200.000', tipo_vivienda: 'Casa en construcción', forma_pago: 'Contado' },
      status: OpportunityStatus.won,
    },
    {
      name: 'Daniel Torres', email: 'daniel.t@example.com', phone: '555-5566',
      origin: LeadOrigin.trade_show, stage: stageSeguimiento ?? stageLeadAranda,
      salespersonIdx: 2, data: { presupuesto: 'Más de $200.000', tipo_vivienda: 'Casa terminada', forma_pago: 'Contado' },
    },
  ];

  for (const c of clientesEjemplo) {
    const client = await db.client.upsert({
      where: { id: `client-seed-${c.email.replace(/[@.]/g, '-')}` },
      update: {},
      create: {
        id: `client-seed-${c.email.replace(/[@.]/g, '-')}`,
        orgId: org.id,
        type: 'person',
        name: c.name,
        email: c.email,
        phone: c.phone,
        origin: c.origin,
      },
    });

    await db.opportunity.upsert({
      where: { id: `opp-seed-${c.email.replace(/[@.]/g, '-')}` },
      update: {},
      create: {
        id: `opp-seed-${c.email.replace(/[@.]/g, '-')}`,
        orgId: org.id,
        clientId: client.id,
        projectId: projAranda.id,
        stageId: c.stage.id,
        salespersonId: vendedorIds[c.salespersonIdx],
        status: (c as any).status ?? OpportunityStatus.open,
        estimatedValue: 200000,
        data: c.data,
        wonAt: (c as any).status === OpportunityStatus.won ? new Date() : null,
      },
    });
  }
  console.log(`✅ ${clientesEjemplo.length} clientes y oportunidades de ejemplo en Arandá`);

  console.log('\n👥 Sembrando 5 clientes demo por proyecto activo en todas las orgs…');
  await seedClientsForActiveProjects(db, { perProject: 5 });

  console.log('\n🎉 Seed completado.\n');
  console.log('Credenciales:');
  console.log('  Superadmin → admin@arquetika.com / Admin2026!');
  console.log('  Vendedor   → juan.morales@arquetika.com / Vendedor2026!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
