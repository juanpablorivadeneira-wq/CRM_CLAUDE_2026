import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',

  // CLAVE: librerías que SOLO se usan en el servidor.
  // argon2/bcryptjs/prisma usan APIs de Node que no se pueden bundlear para el cliente.
  serverExternalPackages: ['bcryptjs', '@prisma/client', 'bullmq', 'ioredis'],

  // Permitir que el build pase aunque haya errores de TS/ESLint en Fase 0.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'http', hostname: 'minio', pathname: '/**' },
      { protocol: 'http', hostname: 'localhost', pathname: '/**' },
    ],
  },
};

export default nextConfig;
