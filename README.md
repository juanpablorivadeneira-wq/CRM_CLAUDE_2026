# BK-CRM

CRM comercial multi-tenant para constructoras — módulo del ecosistema **BuildKontrol**.

Gestiona el ciclo de ventas completo por línea de negocio (Inmobiliaria, Diseño, Construcción) con agente IA autónomo (Fase 7+).

---

## Stack

| Capa | Tecnología |
|---|---|
| App | Next.js 15 · TypeScript · Tailwind CSS |
| Base de datos | PostgreSQL 16 + Prisma ORM |
| Auth | Auth.js (Credentials + JWT) con 2FA TOTP |
| Archivos | MinIO (S3-compatible) |
| Colas | Redis + BullMQ |
| Proxy | Caddy (TLS automático) |
| IA (Fase 7) | Anthropic Claude |

---

## Despliegue en Synology DS1522+

> **Importante:** el flujo es **pull-only**. La imagen Docker se construye en GitHub Actions
> (workflow `Build and Push Docker Image`) y se publica en `ghcr.io`. El Synology solo descarga
> la imagen ya construida — nunca compila local. Cero riesgo de errores de red durante build.
>
> Para la guía paso a paso desde cero (incluyendo cómo configurar el `.env`, hacer la imagen
> pública o usar token de GHCR), ver [`INSTALAR.md`](./INSTALAR.md).

### Resumen rápido

```bash
ssh usuario@IP-SYNOLOGY
sudo -i
cd /volume1/docker
git clone https://github.com/juanpablorivadeneira-wq/CRM_CLAUDE_2026.git bk-crm
cd bk-crm
cp .env.example .env
nano .env                      # edita GITHUB_USER, AUTH_SECRET, passwords
bash scripts/synology-bootstrap.sh
```

El script `synology-bootstrap.sh` es **idempotente** y se encarga de:

1. Validar el `.env`.
2. Crear los directorios persistentes (`.docker-data/{db,redis,minio,caddy}`).
3. Hacer `docker compose pull` desde ghcr.io.
4. Hacer `docker compose up -d` (db + redis + minio + web + worker + caddy).
5. Aplicar el schema Prisma con `prisma db push --accept-data-loss --skip-generate`.
6. Sembrar los datos iniciales con `npm run db:seed`.

Credenciales del seed:
- Superadmin: `admin@arquetika.com` / `Admin2026!`
- Vendedor: `juan.morales@arquetika.com` / `Vendedor2026!`

### Actualizar el sistema

```bash
# En tu PC: push del cambio a main
git push origin main
# GitHub Actions reconstruye la imagen (~5-8 min)

# En el Synology
cd /volume1/docker/bk-crm
docker compose pull
docker compose up -d
```

---

## Desarrollo local

```bash
npm install
docker compose up db redis minio -d
cp .env.example .env
# Editar .env: POSTGRES_HOST=localhost, REDIS_HOST=localhost, MINIO_ENDPOINT=localhost
npm run prisma:migrate
npm run db:seed
npm run dev
# → http://localhost:9002
```

---

## Comandos útiles

```bash
docker compose logs -f web              # ver logs
docker compose restart web              # reiniciar app
docker compose exec web npm run prisma:studio   # visor de DB
docker compose exec db pg_dump -U bkcrm bkcrm > backup.sql  # backup
git push && docker compose pull && docker compose up -d  # actualizar (pull-only)
```

---

## Roadmap

| Fase | Descripción | Estado |
|---|---|---|
| 0 | Base: Postgres, Auth.js, Docker, schema | ✅ |
| 1 | Multi-tenant, roles, permisos granulares | 🔜 |
| 2 | ProjectType + funnels editables | 🔜 |
| 3 | Client + Opportunity + UI base (kanban, ficha 360) | 🔜 |
| 4 | Dashboard ejecutivo + reportes + exportes | 🔜 |
| 5 | CalendarService (agenda humana) | 🔜 |
| 6 | WhatsApp Business + Meta Ads + email | 🔜 |
| 7 | Agente IA Claude (autónomo en Arandá) | 🔜 |
| 8 | AI Inbox, handoffs, modos, cap de gasto | 🔜 |
| 9 | Stripe + planes + self-service onboarding | 🔜 |
| 10 | Hardening, monitoreo, go-live | 🔜 |
