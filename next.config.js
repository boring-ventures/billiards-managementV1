/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Improve caching for static assets
  assetPrefix: process.env.NODE_ENV === 'production' ? undefined : undefined,
  images: {
    domains: [
      "avatars.githubusercontent.com",
      "github.com",
      "lh3.googleusercontent.com",
      "res.cloudinary.com",
      "abs.twimg.com",
      "pbs.twimg.com"
    ],
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Similarly, this ignores TypeScript errors during the build
    ignoreBuildErrors: true,
  },
  // Enable faster builds with SWC
  // experimental: {
  //   forceSwcTransforms: true,
  //   serverActions: {
  //     bodySizeLimit: '2mb',
  //     allowedOrigins: [
  //       'localhost:3000', 
  //       'billiards-management-v1.vercel.app', 
  //       'billiards-management-v1-7q7ypbvoo.vercel.app',
  //       'billiards-management-v1-7rneq5217.vercel.app',
  //       '*.vercel.app'
  //     ]
  //   }
  // },
  // Improve response to timeouts in serverless environments
  serverRuntimeConfig: {
    // Increase function timeouts as a fallback
    timeout: 20000, // 20 seconds
  },
  // Improve static assets caching
  headers: async () => {
    return [
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Add explicit cache headers for JavaScript files
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  // External packages that should be treated as server components
  serverExternalPackages: ['@prisma/client'],
  // Improved error handling for RSC requests
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 60 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 5,
  },
  // Ensure API routes are properly handled
  async rewrites() {
    return [
      {
        source: '/api/profile',
        destination: '/api/profile',
      },
      {
        source: '/api/profile/by-id',
        destination: '/api/profile',
      },
      {
        source: '/api/admin/superadmins',
        destination: '/api/admin/superadmins',
      }
    ];
  }
};

module.exports = nextConfig;
