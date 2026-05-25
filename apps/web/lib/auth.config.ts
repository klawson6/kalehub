import type { NextAuthConfig } from 'next-auth'
import Keycloak from 'next-auth/providers/keycloak'

const internalBase =
  process.env['KEYCLOAK_INTERNAL_URL'] ?? process.env['KEYCLOAK_ISSUER']!

// Edge-compatible config — no Node.js-only imports (no Prisma).
// Used directly by middleware and extended by lib/auth.ts.
export const authConfig: NextAuthConfig = {
  providers: [
    Keycloak({
      clientId: process.env['KEYCLOAK_CLIENT_ID']!,
      clientSecret: process.env['KEYCLOAK_CLIENT_SECRET']!,
      issuer: process.env['KEYCLOAK_ISSUER']!,
      token: `${internalBase}/protocol/openid-connect/token`,
      userinfo: `${internalBase}/protocol/openid-connect/userinfo`,
    }),
  ],
  callbacks: {
    authorized({ auth }) {
      return !!auth
    },
    jwt({ token }) {
      return token
    },
    session({ session }) {
      return session
    },
  },
}
