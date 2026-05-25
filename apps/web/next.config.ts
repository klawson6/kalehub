import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@prisma/client', '@kalehub/db'],
  // Type checking is handled by the separate `typecheck` Turborepo task (tsc --noEmit).
  // next-auth v5 beta exports trigger TS2742 in Next.js's embedded checker due to
  // pnpm internal path resolution; that check doesn't fire in plain `tsc --noEmit`.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
}

export default nextConfig
