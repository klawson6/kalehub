import type { NextAuthConfig } from 'next-auth';
import { env } from '@/env';

const internalBase = env.KEYCLOAK_INTERNAL_URL ?? env.KEYCLOAK_ISSUER;

// Edge-compatible config — no Node.js-only imports (no Prisma).
// Used directly by middleware and extended by lib/auth.ts.
//
// We use type: 'oauth' instead of type: 'oidc' to bypass OIDC discovery entirely.
// With type: 'oidc', Auth.js fetches the discovery document from issuer/.well-known/openid-configuration.
// Inside the web Docker container, `issuer` resolves to localhost:8080 which is the container's own
// loopback — unreachable. All server-side endpoints use `internalBase` (http://keycloak:8080/...).
// The authorization URL uses the external issuer so the browser can follow the redirect.
export const authConfig: NextAuthConfig = {
  providers: [
    {
      id: 'keycloak',
      name: 'Keycloak',
      type: 'oauth',
      clientId: env.KEYCLOAK_CLIENT_ID,
      clientSecret: env.KEYCLOAK_CLIENT_SECRET,
      // issuer allows oauth4webapi to validate the `iss` parameter Keycloak 26 appends
      // to the callback URL per RFC 9207. Must match KC_HOSTNAME=localhost.
      issuer: env.KEYCLOAK_ISSUER,
      authorization: {
        url: `${env.KEYCLOAK_ISSUER}/protocol/openid-connect/auth`,
        params: { scope: 'openid email profile', response_type: 'code' },
      },
      token: `${internalBase}/protocol/openid-connect/token`,
      userinfo: `${internalBase}/protocol/openid-connect/userinfo`,
      profile(profile: Record<string, unknown>) {
        return {
          id: profile.sub as string,
          name: (profile.name as string | null) ?? null,
          email: profile.email as string,
          image: (profile.picture as string | null) ?? null,
        };
      },
      checks: ['pkce', 'state'],
    },
  ],
  callbacks: {
    authorized({ auth }) {
      return !!auth;
    },
    jwt({ token }) {
      return token;
    },
    session({ session }) {
      return session;
    },
  },
};
