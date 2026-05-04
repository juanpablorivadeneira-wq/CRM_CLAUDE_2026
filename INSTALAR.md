# BK-CRM — Instalación con GitHub Actions

> **¿Por qué este enfoque?** El build se hace en GitHub (red estable, 1-shot)
> y el Synology solo descarga la imagen ya construida. **Cero riesgo de ECONNRESET.**

---

## Resumen del proceso (15 min total)

1. Crear repo en GitHub → 1 min
2. Subir el código → 2 min
3. GitHub Actions construye la imagen → 5-8 min (automático)
4. Configurar Synology → 3 min
5. Iniciar el sistema → 2 min

---

## PARTE 1 — En tu PC (subir código a GitHub)

### 1.1. Crear el repo en GitHub

1. Entra a <https://github.com/new>
2. Nombre: `bk-crm` (o el que quieras)
3. Visibilidad: **Privado** ✓ (recomendado, contiene tu lógica de negocio)
4. **NO** marques "Add README", "Add .gitignore" ni "Choose license"
5. Click **Create repository**

### 1.2. Subir el código

Descomprime este ZIP en tu PC y abre una terminal dentro de la carpeta `bkcrm-final`:

```bash
cd ruta/a/bkcrm-final

git init
git add .
git commit -m "BK-CRM inicial"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/bk-crm.git
git push -u origin main
```

> ⚠️ Asegúrate de haber renombrado `bkcrm-final` o estar dentro de esa carpeta.
> El `.gitignore` ya excluye `.env` y `.docker-data/` — tus secretos NO se suben.

### 1.3. Esperar a que GitHub Actions construya la imagen

1. Entra a tu repo en GitHub → pestaña **Actions**
2. Verás "Build and Push Docker Image" corriendo
3. Tarda **5-8 minutos**
4. Cuando termine en verde ✅, la imagen ya está publicada en:
   ```
   ghcr.io/tu-usuario/bk-crm-web:latest
   ```

### 1.4. (Opcional pero recomendado) Hacer la imagen pública

Por defecto la imagen es privada. Para que el Synology pueda descargarla sin token:

1. GitHub → tu perfil (esquina superior derecha) → **Your packages**
2. Click en **bk-crm-web**
3. **Package settings** (botón en la derecha)
4. Scroll abajo → **Change visibility** → **Public** → confirmar

> Si prefieres mantenerla privada, te explico al final cómo configurar el token.

---

## PARTE 2 — En tu Synology

### 2.1. Subir el ZIP al Synology

Por SSH:
```bash
ssh tu-usuario@192.168.136.148
sudo -i
cd /volume1/docker/

# Borra cualquier intento previo
rm -rf bk-crm bk-crm_claude_2026 bkcrm-final

# Descomprime el ZIP que subiste por File Station a /volume1/docker/
unzip bk-crm-listo-v3.zip
mv bkcrm-final bk-crm
cd bk-crm
```

### 2.2. Editar .env

```bash
nano .env
```

Cambia **solo** esta línea (la primera):
```
GITHUB_USER=tu-usuario-github
```
Pon tu usuario de GitHub **en minúsculas** (igual que en la URL del repo).

Guarda con `Ctrl+O` → Enter → `Ctrl+X`.

### 2.3. Crear proyecto en Container Manager

1. **Container Manager** → **Proyecto** → **Crear**
2. Configuración:
   - **Nombre:** `bk-crm`
   - **Ruta:** `/volume1/docker/bk-crm`
   - **Origen:** *Usar `docker-compose.yml` existente*
3. **Siguiente** → **Hecho**

> Esta vez Container Manager **NO va a construir nada**. Solo descarga la imagen
> de ghcr.io (~250 MB en una sola descarga). Tarda 1-3 min.

### 2.4. Inicializar la base de datos (solo la primera vez)

Cuando los 6 contenedores estén verdes:

```bash
cd /volume1/docker/bk-crm

docker exec bkcrm-web npx prisma db push --accept-data-loss --skip-generate
docker exec bkcrm-web npm run db:seed
```

---

## ✅ Listo

- BK-CRM: <http://192.168.136.148:8081>
- MinIO: <http://192.168.136.148:9011>

### Credenciales demo

| Rol | Email | Password |
|---|---|---|
| Admin | `admin@arquetika.com` | `Admin2026!` |
| Vendedor | `juan.morales@arquetika.com` | `Vendedor2026!` |

---

## Para actualizar el sistema en el futuro

Cuando hagas cambios al código:

```bash
# En tu PC
git add .
git commit -m "lo que cambió"
git push

# Espera 5-8 min a que GitHub Actions reconstruya la imagen

# En el Synology
cd /volume1/docker/bk-crm
docker compose pull   # baja la nueva imagen
docker compose up -d  # reinicia con la nueva imagen
```

O directamente desde Container Manager → **Acción** → **Reconstruir** (lo hará con `pull`, no con build local).

---

## Si la imagen es PRIVADA (no la hiciste pública)

Necesitas autenticar el Synology con un token de GitHub:

1. GitHub → tu perfil → **Settings** → **Developer settings** → **Personal access tokens (classic)** → **Generate new token (classic)**
2. Permisos: marca solo `read:packages`
3. Copia el token (empieza con `ghp_...`)
4. En el Synology:
   ```bash
   echo "ghp_TU_TOKEN" | docker login ghcr.io -u TU-USUARIO --password-stdin
   ```
5. Listo. Ahora el `docker compose pull` funciona.

---

## Diagnóstico

```bash
# Ver estado de los servicios
docker compose ps

# Logs
docker logs bkcrm-web --tail=50
docker logs bkcrm-worker --tail=50

# Forzar descarga de imagen nueva
docker compose pull --no-cache web

# Empezar de cero
docker compose down -v
sudo rm -rf .docker-data/db .docker-data/redis .docker-data/minio
mkdir -p .docker-data/{db,redis,minio,caddy/data,caddy/config}
docker compose up -d
```
