/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['rewriteme.app'],
  },
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth', 'bcryptjs'],
  },
};

module.exports = nextConfig;
