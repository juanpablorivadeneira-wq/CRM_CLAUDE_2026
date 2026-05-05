# =============================================================================
# BK-CRM — Dockerfile multi-stage v4 (RESILIENTE A RED SYNOLOGY)
#
# Mejoras v4:
#   • Forzar IPv4 (--dns-result-order=ipv4first) — causa #1 de ECONNRESET
#   • npm ci sin postinstall scripts (--ignore-scripts)
#   • prisma engines descargado por separado, con 10 reintentos
#   • prisma generate por separado, con 10 reintentos
#   • maxsockets=1 → una sola conexión a la vez, máximo respeto a la red
# =============================================================================

# ---- 1. Dependencias --------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app

RUN apk add --no-cache libc6-compat python3 make g++ openssl curl ca-certificates

# CRÍTICO: forzar IPv4. Si el Synology tiene IPv6 mal configurado, ECONNRESET.
ENV NODE_OPTIONS="--dns-result-order=ipv4first"
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1

# Configuración de npm RESILIENTE
RUN npm config set fetch-retries 15 && \
    npm config set fetch-retry-mintimeout 60000 && \
    npm config set fetch-retry-maxtimeout 600000 && \
    npm config set fetch-timeout 1800000 && \
    npm config set maxsockets 1

COPY package.json package-lock.json* ./
COPY prisma ./prisma

# PASO 1: npm ci SIN postinstall scripts (rápido y robusto)
RUN for i in 1 2 3 4 5 6 7 8 9 10; do \
      echo "===> npm ci intento $i/10" && \
      npm ci --ignore-scripts --prefer-offline --no-audit --no-fund && break || \
      (echo "Intento $i fallo, esperando 60s..." && sleep 60); \
    done

# PASO 2: Descarga binarios de Prisma con su propio loop de 10 reintentos.
RUN for i in 1 2 3 4 5 6 7 8 9 10; do \
      echo "===> prisma engines intento $i/10" && \
      (cd node_modules/@prisma/engines && node scripts/postinstall.js) && break || \
      (echo "Prisma engines intento $i fallo, esperando 60s..." && sleep 60); \
    done

# PASO 3: Genera el cliente Prisma con 10 reintentos
RUN for i in 1 2 3 4 5 6 7 8 9 10; do \
      echo "===> prisma generate intento $i/10" && \
      npx prisma generate && break || \
      (echo "Prisma generate intento $i fallo, esperando 60s..." && sleep 60); \
    done

# ---- 2. Build ---------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--dns-result-order=ipv4first"

RUN apk add --no-cache openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Bundle del worker BullMQ con esbuild + reintentos.
# Bundleamos TODAS las deps del worker (bullmq, ioredis, pino, tslib, etc.)
# dentro de worker.js para que sea self-contained en el runner.
# Solo @prisma/client queda external porque tiene binarios .node nativos.
RUN for i in 1 2 3 4 5 6 7 8 9 10; do \
      npm i -D esbuild --no-save --prefer-offline --no-audit --no-fund && break || sleep 30; \
    done && \
    npx esbuild worker/index.ts \
      --bundle --platform=node --target=node20 \
      --outfile=worker.js \
      --external:@prisma/client

# ---- 3. Runtime -------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl wget && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

COPY --from=builder --chown=nextjs:nodejs /app/worker.js ./worker.js

COPY --from=builder --chown=nextjs:nodejs /app/node_modules/tsx ./node_modules/tsx
COPY --from=builder --chown=nextjs:nodejs /app/src ./src
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
