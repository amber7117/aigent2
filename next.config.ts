import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Enable Turbopack for development
  turbopack: {
    rules: {
      // Add any custom Turbopack rules here if needed
    },
  },
  // Keep webpack config for production builds
  webpack: (config, { isServer, dev }) => {
    // Only apply webpack config in production or when Turbopack is not active
    if (!dev) {
      if (!isServer) {
        // Exclude Firebase Admin SDK from client bundle
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          net: false,
          tls: false,
          crypto: false,
          'firebase-admin': false,
          '@google-cloud/storage': false,
          'google-auth-library': false,
        };
      }
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
