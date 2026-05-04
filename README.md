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

### Requisitos previos

1. **DSM 7** con Container Manager instalado.
2. **Carpeta base** creada en el Synology:
   ```
   /volume1/docker/bk-crm/
   ```
3. Dominio o DDNS apuntando a la IP del Synology para TLS. Sin dominio, funciona por `http://IP:80` en LAN.

### Paso 1 — Clonar el proyecto en el Synology

```bash
ssh usuario@IP-SYNOLOGY
cd /volume1/docker/bk-crm
git clone https://github.com/juanpablorivadeneira-wq/crm_2026.git .
```

### Paso 2 — Crear el `.env`

```bash
cp .env.example .env
nano .env
```

Mínimo para arrancar:
```env
POSTGRES_PASSWORD=clave-segura
MINIO_ROOT_PASSWORD=otra-clave
AUTH_SECRET=resultado-de--openssl-rand--base64-32
DATABASE_URL=postgresql://bkcrm:clave-segura@db:5432/bkcrm?schema=public
```

### Paso 3 — Crear directorios de volúmenes

```bash
mkdir -p .docker-data/{db,redis,minio,caddy/data,caddy/config}
```

### Paso 4 — Levantar servicios

```bash
docker compose up -d
```

Primera vez tarda ~5 min (build de Next.js).

### Paso 5 — Migrar DB y seedear

```bash
docker compose exec web npx prisma migrate deploy
docker compose exec web npm run db:seed
```

Credenciales del seed:
- Superadmin: `admin@arquetika.com` / `Admin2026!`
- Vendedor: `juan.morales@arquetika.com` / `Vendedor2026!`

### Paso 6 — Abrir en el navegador

```
http://IP-DEL-SYNOLOGY
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
git pull && docker compose build web && docker compose up -d  # actualizar
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
