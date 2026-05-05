#!/usr/bin/env bash
# =============================================================================
# BK-CRM — Bootstrap del despliegue en Synology
#
# Idempotente: lo puedes ejecutar varias veces sin romper nada.
#
# Uso:
#   cd /volume1/docker/bk-crm
#   bash scripts/synology-bootstrap.sh
#
# Requisitos previos (una sola vez):
#   1. .env existe y está editado (copiar de .env.example)
#   2. Si la imagen es privada en GHCR, ya hiciste:
#        echo "ghp_TOKEN" | docker login ghcr.io -u TU-USUARIO --password-stdin
# =============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."

# --- 0. Sanity checks -------------------------------------------------------
if [[ ! -f .env ]]; then
  echo "ERROR: no existe .env. Copia .env.example a .env y edítalo primero."
  echo "  cp .env.example .env && nano .env"
  exit 1
fi

if ! grep -q "^GITHUB_USER=" .env || grep -q "^GITHUB_USER=tu-usuario-github" .env; then
  echo "ERROR: GITHUB_USER no está configurado en .env."
  echo "  Edita .env y pon tu usuario de GitHub en minúsculas."
  exit 1
fi

if grep -q "cambia-esto-con-openssl-rand" .env; then
  echo "ERROR: AUTH_SECRET sigue con el valor placeholder."
  echo "  Genera uno con:  openssl rand -base64 32"
  echo "  y pégalo en .env como AUTH_SECRET=..."
  exit 1
fi

# --- 1. Crear volúmenes persistentes ----------------------------------------
echo "==> Creando directorios de volúmenes..."
mkdir -p .docker-data/{db,redis,minio,caddy/data,caddy/config}

# --- 2. Pull de la imagen desde GHCR ----------------------------------------
echo "==> Descargando imagen desde ghcr.io..."
docker compose pull

# --- 3. Levantar todos los servicios ----------------------------------------
echo "==> Levantando servicios (db, redis, minio, web, worker, caddy)..."
docker compose up -d

# --- 4. Esperar a que la base de datos esté lista ---------------------------
echo "==> Esperando a que PostgreSQL responda..."
for i in {1..30}; do
  if docker compose exec -T db pg_isready -U "$(grep ^POSTGRES_USER .env | cut -d= -f2)" >/dev/null 2>&1; then
    echo "    db lista."
    break
  fi
  sleep 2
done

# --- 5. Esperar a que el contenedor web esté arriba -------------------------
echo "==> Esperando a que web esté arriba..."
for i in {1..30}; do
  if docker inspect -f '{{.State.Running}}' bkcrm-web 2>/dev/null | grep -q true; then
    echo "    web corriendo."
    break
  fi
  sleep 2
done

# --- 6. Aplicar schema Prisma (idempotente) ---------------------------------
echo "==> Aplicando schema Prisma a la base de datos..."
docker exec bkcrm-web npx prisma db push --accept-data-loss --skip-generate

# --- 7. Seed (solo si la tabla está vacía) ----------------------------------
echo "==> Sembrando datos iniciales (idempotente)..."
docker exec bkcrm-web npm run db:seed || echo "    seed omitido (probablemente ya sembrado)."

# --- 8. Status final --------------------------------------------------------
echo ""
echo "==> Estado de los contenedores:"
docker compose ps

echo ""
echo "============================================================"
echo "  BK-CRM listo."
echo "  Web:    http://$(grep ^APP_ROOT_DOMAIN .env | cut -d= -f2):8081"
echo "  MinIO:  http://$(grep ^APP_ROOT_DOMAIN .env | cut -d= -f2):9011"
echo "============================================================"
