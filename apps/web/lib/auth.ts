import { prisma } from '@kalehub/db';
import { SignJWT } from 'jose';
import type { NextAuthResult, Session } from 'next-auth';
import NextAuth from 'next-auth';
import { env } from '@/env';
import { authConfig } from './auth.config';

const secret = new TextEncoder().encode(env.AUTH_SECRET);

const {
  handlers,
  signIn,
  signOut,
  auth: _auth,
}: NextAuthResult = NextAuth({
  ...authConfig,
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) {
        const email = profile.email;
        if (!email) throw new Error('Keycloak profile is missing required field: email');
        const user = await prisma.user.upsert({
          where: { keycloakId: profile.sub as string },
          update: { email, name: (profile.name as string | undefined) ?? null },
          create: {
            keycloakId: profile.sub as string,
            email,
            name: (profile.name as string | undefined) ?? null,
          },
        });
        token.userId = user.id;
      }

      if (!token.accessToken) {
        token.accessToken = await new SignJWT({ sub: token.userId as string })
          .setProtectedHeader({ alg: 'HS256' })
          .setIssuedAt()
          .setExpirationTime('7d')
          .sign(secret);
      }

      return token;
    },

    async session({ session, token }) {
      session.userId = token.userId as string;
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
});

export { handlers, signIn, signOut };

// next-auth v5 beta: the `auth` overload union references next-auth/lib (unexported internal
// subpath), causing TS2742 with pnpm's symlink layout. We only use the no-arg overload in
// server components, so export a wrapper with a portable type.
export const auth = _auth as unknown as () => Promise<Session | null>;
