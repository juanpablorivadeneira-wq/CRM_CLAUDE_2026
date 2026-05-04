/**
 * BK-CRM — Worker BullMQ
 * Fase 0: estructura lista, sin jobs activos.
 * Fase 7+: se agregan jobs de IA, notificaciones, WhatsApp, sync calendarios.
 */

import { Worker, Queue } from 'bullmq';
import { logger } from '../src/lib/logger';

const connection = {
  host: process.env.REDIS_HOST ?? 'redis',
  port: parseInt(process.env.REDIS_PORT ?? '6379'),
};

// ---------------------------------------------------------------------------
// Queues (se van llenando en fases posteriores)
// ---------------------------------------------------------------------------
export const notificationsQueue = new Queue('notifications', { connection });
export const aiQueue = new Queue('ai-agent', { connection });
export const calendarQueue = new Queue('calendar-sync', { connection });

// ---------------------------------------------------------------------------
// Workers
// ---------------------------------------------------------------------------
const notificationsWorker = new Worker(
  'notifications',
  async (job) => {
    logger.info({ jobId: job.id, name: job.name }, 'notifications job — stub');
  },
  { connection, concurrency: 5 }
);

const aiWorker = new Worker(
  'ai-agent',
  async (job) => {
    logger.info({ jobId: job.id, name: job.name }, 'ai-agent job — stub (activo en Fase 7)');
  },
  { connection, concurrency: 2 }
);

const calendarWorker = new Worker(
  'calendar-sync',
  async (job) => {
    logger.info({ jobId: job.id, name: job.name }, 'calendar-sync job — stub');
  },
  { connection, concurrency: 3 }
);

// ---------------------------------------------------------------------------
// Arranque y shutdown graceful
// ---------------------------------------------------------------------------
async function main() {
  logger.info('BK-CRM worker arrancado. Esperando jobs…');

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM recibido, cerrando workers…');
    await notificationsWorker.close();
    await aiWorker.close();
    await calendarWorker.close();
    process.exit(0);
  });
}

main().catch((err) => { logger.error(err, 'Worker error fatal'); process.exit(1); });
