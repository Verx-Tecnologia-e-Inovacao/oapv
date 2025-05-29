/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Permite que o build complete mesmo com erros de ESLint
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
