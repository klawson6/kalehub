import type { NextMiddleware } from 'next/server';
import { NextResponse } from 'next/server';
import type { NextAuthRequest, NextAuthResult } from 'next-auth';
import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

const { auth }: NextAuthResult = NextAuth(authConfig);

// next-auth v5 beta: auth() return type references next-auth/lib (unexported internal subpath),
// causing TS2742 with pnpm. Cast to NextMiddleware — the actual runtime type is compatible.
const middleware = auth((request: NextAuthRequest) => {
  if (!request.auth) {
    const signInUrl = new URL('/sign-in', request.url);
    return NextResponse.redirect(signInUrl);
  }
}) as unknown as NextMiddleware;

export default middleware;

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|sign-in|favicon.ico).*)'],
};
