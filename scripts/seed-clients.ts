/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { PrismaClient, LeadOrigin } from '@prisma/client';

const db = new PrismaClient();

const FIRST_NAMES = ['Carlos', 'Ana', 'Sofía', 'Daniel', 'María', 'Javier', 'Lucía', 'Andrés', 'Camila', 'Luis'];
const LAST_NAMES = ['Hernández', 'García', 'Martínez', 'Torres', 'López', 'Pérez', 'Ramírez', 'Vega', 'Castillo', 'Mendoza'];
const ORIGINS: LeadOrigin[] = [
  LeadOrigin.meta_ads,
  LeadOrigin.web_form,
  LeadOrigin.referral,
  LeadOrigin.trade_show,
  LeadOrigin.cold_call,
  LeadOrigin.whatsapp_inbound,
];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  const args = process.argv.slice(2);
  const orgSlugFlag = args.find((a) => a.startsWith('--org='))?.slice(6);
  const perProjectFlag = args.find((a) => a.startsWith('--count='))?.slice(8);
  const perProject = perProjectFlag ? parseInt(perProjectFlag, 10) : 5;

  const orgs = orgSlugFlag
    ? [await db.organization.findUnique({ where: { slug: orgSlugFlag } })]
    : await db.organization.findMany({ where: { slug: { not: 'system' } } });

  for (const org of orgs) {
    if (!org) continue;
    console.log(`\n📦 Org: ${org.name} (${org.slug})`);

    const projects = await db.project.findMany({
      where: { orgId: org.id, deletedAt: null, status: 'active' },
      include: {
        projectType: {
          include: { stages: { orderBy: { order: 'asc' } } },
        },
      },
    });

    if (projects.length === 0) {
      console.log('  · sin proyectos activos, saltando.');
      continue;
    }

    for (const project of projects) {
      const existingCount = await db.opportunity.count({
        where: { orgId: org.id, projectId: project.id, deletedAt: null },
      });

      if (existingCount >= perProject) {
        console.log(`  ↪ ${project.name}: ya tiene ${existingCount} oportunidades, saltando.`);
        continue;
      }

      const toCreate = perProject - existingCount;
      const stages = project.projectType.stages.filter((s) => !s.isLost);
      if (stages.length === 0) {
        console.log(`  ⚠ ${project.name}: sin etapas, saltando.`);
        continue;
      }

      for (let i = 0; i < toCreate; i++) {
        const first = rand(FIRST_NAMES);
        const last = rand(LAST_NAMES);
        const name = `${first} ${last}`;
        const slug = `${first}.${last}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        const email = `${slug}.${project.id.slice(0, 6)}.${i + 1}@demo.local`;
        const phone = `09${Math.floor(10000000 + Math.random() * 89999999)}`;
        const origin = rand(ORIGINS);
        const stage = rand(stages);

        const stableId = `seed-${project.id.slice(0, 8)}-${i + 1}`;

        const client = await db.client.upsert({
          where: { id: stableId },
          update: {},
          create: {
            id: stableId,
            orgId: org.id,
            type: 'person',
            name,
            email,
            phone,
            whatsapp: phone,
            origin,
            city: rand(['Quito', 'Guayaquil', 'Cuenca', 'Manta']),
            tags: ['demo'],
          },
        });

        await db.opportunity.upsert({
          where: { id: `${stableId}-opp` },
          update: {},
          create: {
            id: `${stableId}-opp`,
            orgId: org.id,
            clientId: client.id,
            projectId: project.id,
            stageId: stage.id,
            status: stage.isWon ? 'won' : 'open',
            estimatedValue: 50000 + Math.floor(Math.random() * 200000),
            unitDetail: `Unidad ${String.fromCharCode(65 + (i % 8))}-${100 + i}`,
            wonAt: stage.isWon ? new Date() : null,
          },
        });
      }

      console.log(`  ✅ ${project.name}: +${toCreate} clientes (${existingCount + toCreate}/${perProject}).`);
    }
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
