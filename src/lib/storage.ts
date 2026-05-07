import 'server-only';
import { Client as MinioClient } from 'minio';
import { logger } from './logger';

const endpoint = process.env.MINIO_ENDPOINT ?? 'minio';
const port = parseInt(process.env.MINIO_PORT ?? '9000', 10);
const useSSL = (process.env.MINIO_USE_SSL ?? 'false') === 'true';
const accessKey = process.env.MINIO_ROOT_USER ?? '';
const secretKey = process.env.MINIO_ROOT_PASSWORD ?? '';
const bucketName = process.env.MINIO_BUCKET ?? 'bkcrm';
const publicUrl = (process.env.MINIO_PUBLIC_URL ?? `http://${endpoint}:${port}`).replace(/\/$/, '');

let cachedClient: MinioClient | null = null;
function getClient(): MinioClient {
  if (cachedClient) return cachedClient;
  cachedClient = new MinioClient({ endPoint: endpoint, port, useSSL, accessKey, secretKey });
  return cachedClient;
}

let bucketReady = false;
async function ensureBucket() {
  if (bucketReady) return;
  const client = getClient();
  const exists = await client.bucketExists(bucketName).catch(() => false);
  if (!exists) {
    await client.makeBucket(bucketName, 'us-east-1');
  }
  // Política pública de lectura — los archivos son URLs accesibles desde el navegador.
  // Si en el futuro queremos URLs firmadas, cambiar a presignedGetObject por archivo.
  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${bucketName}/*`],
      },
    ],
  };
  await client.setBucketPolicy(bucketName, JSON.stringify(policy)).catch((e) => {
    logger.warn({ err: e }, 'No se pudo aplicar política pública al bucket; continúa');
  });
  bucketReady = true;
}

export type UploadInput = {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  prefix?: string;
};

export async function uploadFile({ buffer, mimeType, originalName, prefix = 'uploads' }: UploadInput) {
  await ensureBucket();
  const client = getClient();
  const ext = (originalName.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const safeExt = ext.length > 0 && ext.length < 8 ? `.${ext}` : '';
  const objectName = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safeExt}`;
  await client.putObject(bucketName, objectName, buffer, buffer.length, {
    'Content-Type': mimeType,
  });
  return {
    objectName,
    url: `${publicUrl}/${bucketName}/${objectName}`,
  };
}
