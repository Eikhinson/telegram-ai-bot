/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['node-telegram-bot-api']
  },
  images: {
    domains: ['api.a4f.co', 'cdn.openai.com'],
    unoptimized: true
  }
};

export default nextConfig;
