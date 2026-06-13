/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['better-sqlite3', 'bcryptjs', '@anthropic-ai/sdk'],
}

module.exports = nextConfig
