/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      // Add your Supabase project domain
      "swfgvfhpmicwptupjyko.supabase.co",
      "xqakfzhkeiongvzgbhji.supabase.co",
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
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
      allowedOrigins: ['localhost:3000', 'billiards-management-v1.vercel.app']
    }
  },
  // External packages that should be treated as server components
  serverExternalPackages: ['@prisma/client'],
  // Improved error handling for RSC requests
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 60 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 5,
  }
};

module.exports = nextConfig;
