# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies (run after pulling or changing package.json files)
pnpm install

# Build all packages (dependency-ordered via Turborepo)
pnpm build

# Type-check all packages
pnpm typecheck

# Check all packages (lint + formatting via Biome)
pnpm lint

# Auto-fix safe lint and formatting issues
pnpm lint:fix

# Auto-fix including unsafe transforms (e.g. bracket → dot notation)
pnpm exec biome check --write --unsafe .

# Run unit tests across all packages
pnpm test:unit

# Run a single package's tests
pnpm --filter api test:unit
pnpm --filter ws test:unit
pnpm --filter web test:unit

# Run a specific Vitest test file
pnpm --filter api exec vitest run src/domains/user/user.service.test.ts

# Start all services via Docker Compose (primary dev workflow)
docker compose up

# Start only infra services (postgres, redis, keycloak) — run apps natively
docker compose up postgres redis keycloak

# Database migrations
pnpm db:migrate    # create + apply a new migration
pnpm db:generate   # regenerate Prisma client after schema changes
pnpm db:studio     # open Prisma Studio
```

## Architecture

Three independently containerised TypeScript services communicate through REST, WebSocket, and Redis pub/sub. All services share types via the `@kalehub/types` workspace package.

**Monorepo layout:**
- `apps/api` — Fastify REST API (port 3001)
- `apps/ws` — Socket.io WebSocket service (port 3002)
- `apps/web` — Next.js 15 App Router frontend (port 3000)
- `packages/types` — shared TypeScript interfaces (`UserDTO`, `MessageDTO`, `ServerToClientEvents`, `ClientToServerEvents`)
- `packages/db` — Prisma schema, generated client, and a `prisma` singleton exported for use in `api` and `ws`

**Infra services:** Keycloak 26 (port 8080), PostgreSQL 16 (port 5432), Redis 7 (port 6379).

### Auth flow

Keycloak owns all credentials — the app never handles passwords. Auth.js v5 uses the Keycloak OIDC provider. On first login, the Auth.js `jwt` callback upserts a `User` row in Postgres (`keycloakId = profile.sub`) and embeds the internal `userId` (cuid) in the session JWT. The session JWT is signed with `AUTH_SECRET` and exposed as `session.accessToken`.

`apps/api` and `apps/ws` verify **Auth.js session JWTs only** — they never see Keycloak tokens and only need `AUTH_SECRET`. This is the key wiring point: `apps/web/lib/auth.ts` controls what goes into the JWT and session, and `apps/api/src/plugins/jwt.ts` verifies it using `jose`.

### Real-time message flow

1. Client sends `POST /conversations/:id/messages` with a Bearer JWT to `apps/api`
2. API verifies the sender is a `ConversationParticipant`, persists to Postgres via Prisma, then publishes `{ id, conversationId, senderId, content, createdAt }` to Redis channel `conversation:<id>`
3. `apps/ws` has a `psubscribe("conversation:*")` listener that receives the event and calls `io.to("conversation:<id>").emit("message:new", payload)`
4. The recipient's browser receives the event via their socket connection

The WS service is write-stateless — it only broadcasts. REST is used for sending because it gives the sender a confirmed message ID in the HTTP response.

### API domain structure

`apps/api` is organised by domain, not technical layer. Each domain (`user`, `conversation`, `message`) contains `routes.ts` (thin Fastify handlers), `service.ts` (framework-agnostic business logic), `repository.ts` (Prisma abstraction behind an `IXxxRepository` interface), and `types.ts` (Zod schemas + domain interfaces). Services depend on interfaces, not Prisma directly — use the interface when mocking in unit tests.

Domain errors (`NotFoundError`, `ForbiddenError`, `ConflictError`) are defined in `apps/api/src/shared/errors.ts`. Routes catch these and translate to HTTP status codes.

### Docker

Dev Dockerfiles (`Dockerfile.dev`) install deps and start services in watch mode. Source is bind-mounted via `docker-compose.override.yml` — no rebuild needed for code changes.

Prod Dockerfiles (`Dockerfile.prod`) use five stages: `deps` → `builder` → `tester` → `prod-deps` → `runner`. Unit tests run in the `tester` stage; CI builds to that target so a test failure fails the build. The `prod-deps` stage reinstalls only production dependencies (no devDeps). The `runner` stage is a minimal Alpine image with a non-root `appuser`.

### Turborepo task graph

`build` and `typecheck` depend on `^build` (dependencies build first). `lint` has no `dependsOn` and runs fully in parallel. Always run Turbo commands from the repo root — running `tsc` directly in a package may fail if `packages/types` or `packages/db` haven't been built yet.

### Environment variables

**Local development** — copy `.env.example` to `.env` and fill in values. Docker Compose reads `.env` automatically. When running apps natively (`pnpm dev`) alongside `docker compose up postgres redis keycloak`, the apps also read from `.env` via their own process environment.

**In containers** — Docker Compose injects vars from `.env` into each service and adds hardcoded overrides for internal Docker networking (e.g. `REDIS_URL: redis://redis:6379`, `API_URL: http://api:3001`). These overrides replace the localhost defaults that apply during native development.

---

**`apps/api`**

| Var | Required | Default | Notes |
|---|---|---|---|
| `AUTH_SECRET` | yes | — | Must match `ws` and `web` |
| `DATABASE_URL` | yes | — | Postgres connection string |
| `REDIS_URL` | no | `redis://localhost:6379` | Redis connection string |
| `WEB_URL` | no | `http://localhost:3000` | CORS allowed origin |
| `PORT` | no | `3001` | Listen port |
| `HOST` | no | `0.0.0.0` | Bind address |
| `LOG_LEVEL` | no | `info` | Fastify log level |

---

**`apps/ws`**

| Var | Required | Default | Notes |
|---|---|---|---|
| `AUTH_SECRET` | yes | — | Must match `api` and `web` |
| `DATABASE_URL` | yes | — | Read by Prisma client at startup |
| `REDIS_URL` | no | `redis://localhost:6379` | Redis connection string |
| `WEB_URL` | no | `http://localhost:3000` | CORS allowed origin |
| `PORT` | no | `3002` | Listen port |
| `HOST` | no | `0.0.0.0` | Bind address |

---

**`apps/web`**

Web has two classes of env var. **Server-side** vars are only ever present in the Node.js runtime (server components, API routes, Auth.js callbacks) and are never sent to the browser. **Client-side** (`NEXT_PUBLIC_`) vars are inlined into the browser bundle at build time by Next.js — treat them as public.

All vars are validated at startup via `apps/web/env.ts` (`@t3-oss/env-nextjs`). Missing required vars throw immediately with a clear error. `SKIP_ENV_VALIDATION=1` bypasses this during `next build` (set in `Dockerfile.prod` builder stage where secrets are unavailable).

*Server-side only:*

| Var | Required | Default | Notes |
|---|---|---|---|
| `AUTH_SECRET` | yes | — | Must match `api` and `ws` |
| `KEYCLOAK_ISSUER` | yes | — | External realm URL; used by the browser OAuth redirect and `iss` claim verification |
| `KEYCLOAK_CLIENT_ID` | yes | — | OAuth client ID |
| `KEYCLOAK_CLIENT_SECRET` | yes | — | OAuth client secret; matches `keycloak/realm-export.json` |
| `KEYCLOAK_INTERNAL_URL` | no | `KEYCLOAK_ISSUER` | Docker-internal Keycloak URL for server-side token exchange; set to `http://keycloak:8080/realms/kalehub` in containers so the web container doesn't try to reach `localhost:8080` |
| `API_URL` | no | `http://localhost:3001` | Internal URL for RSC server-side fetches; set to `http://api:3001` in containers |
| `DATABASE_URL` | yes | — | Read by Prisma in Auth.js `jwt` callback to upsert users |
| `NEXTAUTH_URL` | yes | — | Auth.js callback base URL |

*Client-side (inlined at build time, visible in the browser):*

| Var | Required | Default | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | no | `http://localhost:3001` | Public API URL used by browser fetch in client components |
| `NEXT_PUBLIC_WS_URL` | no | `http://localhost:3002` | Socket.io server URL used by the browser |
