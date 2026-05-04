import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      // MinIO (interno o dominio propio cuando se configure)
      { protocol: 'http', hostname: 'minio', pathname: '/**' },
      { protocol: 'http', hostname: 'localhost', pathname: '/**' },
    ],
  },
};

export default nextConfig;
