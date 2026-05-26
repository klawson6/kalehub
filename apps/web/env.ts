import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    AUTH_SECRET: z.string().min(1),
    KEYCLOAK_ISSUER: z.string().url(),
    KEYCLOAK_CLIENT_ID: z.string().min(1),
    KEYCLOAK_CLIENT_SECRET: z.string().min(1),
    KEYCLOAK_INTERNAL_URL: z.string().url().optional(),
    API_URL: z.string().url().default('http://localhost:3001'),
  },
  client: {
    NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3001'),
    NEXT_PUBLIC_WS_URL: z.string().url().default('http://localhost:3002'),
  },
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    KEYCLOAK_ISSUER: process.env.KEYCLOAK_ISSUER,
    KEYCLOAK_CLIENT_ID: process.env.KEYCLOAK_CLIENT_ID,
    KEYCLOAK_CLIENT_SECRET: process.env.KEYCLOAK_CLIENT_SECRET,
    KEYCLOAK_INTERNAL_URL: process.env.KEYCLOAK_INTERNAL_URL,
    API_URL: process.env.API_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
