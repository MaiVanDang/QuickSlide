/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "class-variance-authority",
      "clsx",
    ],
  },

  env: {
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:8080/api',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  },
};

module.exports = nextConfig;
