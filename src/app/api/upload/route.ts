import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/tenant';
import { uploadFile } from '@/lib/storage';
import { logger } from '@/lib/logger';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
]);

export async function POST(req: NextRequest) {
  let ctx;
  try {
    ctx = await getTenantContext();
  } catch {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get('file');
  const prefix = (form.get('prefix') as string | null) ?? 'uploads';

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: 'Falta el archivo (campo "file")' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: 'Archivo demasiado grande (máx 10 MB)' }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ ok: false, error: `Tipo no permitido: ${file.type}` }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const safePrefix = `${ctx.orgSlug}/${prefix.replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const result = await uploadFile({
      buffer,
      mimeType: file.type,
      originalName: file.name,
      prefix: safePrefix,
    });
    return NextResponse.json({ ok: true, url: result.url, objectName: result.objectName });
  } catch (err) {
    logger.error({ err }, 'Upload falló');
    return NextResponse.json({ ok: false, error: 'Error al subir el archivo' }, { status: 500 });
  }
}
