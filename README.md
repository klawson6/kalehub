# Kalehub

A personal instant messaging product built for learning and eventual AWS deployment. v1 delivers sign-up/sign-in and 1:1 direct messages.

## Architecture

Three containerised TypeScript services backed by PostgreSQL, Redis, and Keycloak:

| Service | Purpose | Port |
|---|---|---|
| `web` | Next.js 15 (App Router) — frontend + Auth.js | 3000 |
| `api` | Fastify REST API — business logic, Prisma, Redis publisher | 3001 |
| `ws` | Socket.io WebSocket service — Redis subscriber, real-time delivery | 3002 |
| `keycloak` | OIDC identity provider — owns all credentials | 8080 |
| `postgres` | PostgreSQL 16 — app DB + Keycloak DB | 5432 |
| `redis` | Redis 7 — pub/sub + Socket.io adapter | 6379 |

See [`docs/architecture.md`](docs/architecture.md) for the full technical design.

## Getting Started

### Prerequisites

- Docker & Docker Compose
- [asdf](https://asdf-vm.com/) with the versions pinned in `.tool-versions` (Node.js 24, pnpm 11)

### Local Development

```bash
# 1. Copy and fill in environment variables
cp .env.example .env

# 2. Generate AUTH_SECRET
openssl rand -base64 32
# paste output into AUTH_SECRET in .env

# 3. Start all services
docker compose up
```

Services available at:

| URL | Service |
|---|---|
| http://localhost:3000 | Web app |
| http://localhost:3001/health | API health |
| http://localhost:3002/health | WebSocket health |
| http://localhost:8080 | Keycloak admin console |

On first boot, Keycloak auto-imports the `kalehub` realm from `keycloak/realm-export.json`. The dev client secret is `dev-secret-changeme-in-env` — set `KEYCLOAK_CLIENT_SECRET=dev-secret-changeme-in-env` in your `.env` for local dev.

### Host Machine Development (no Docker for app services)

```bash
pnpm install

# Requires postgres, redis, and keycloak running (e.g. via docker compose up postgres redis keycloak)
pnpm dev
```

### Database

```bash
pnpm db:migrate    # Create and apply a new migration
pnpm db:generate   # Regenerate Prisma client after schema changes
pnpm db:studio     # Open Prisma Studio
```

## Tech Stack

| Layer | Choice |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Frontend | Next.js 15 App Router |
| Auth | Auth.js v5 + Keycloak 26 (OIDC) |
| API | Fastify 5 + TypeScript |
| ORM | Prisma 6 |
| WebSocket | Socket.io 4 + `@socket.io/redis-adapter` |
| Unit/integration tests | Vitest |
| Component tests | Storybook 8 + `@storybook/test` |
| E2E tests | Playwright |
| CI/CD | GitHub Actions |
| IaC (future) | Terraform |

## Repository Layout

```
kalehub/
├── .docker/                  # Dockerfiles (dev + prod) per service
│   ├── api/
│   ├── ws/
│   └── web/
├── apps/
│   ├── api/                  # Fastify REST service (DDD)
│   ├── ws/                   # Socket.io WebSocket service
│   └── web/                  # Next.js frontend
├── packages/
│   ├── types/                # Shared TypeScript interfaces
│   └── db/                   # Prisma schema + client singleton
├── keycloak/
│   └── realm-export.json     # Auto-imported realm config
├── scripts/
│   └── init-db.sh            # Creates keycloak DB on postgres first boot
├── docs/
│   ├── architecture.md
│   └── roadmap.md
├── docker-compose.yml
├── docker-compose.override.yml
└── .env.example
```

## Scripts

```bash
pnpm build        # Build all packages (Turborepo, dependency-ordered)
pnpm typecheck    # Type-check all packages
pnpm lint         # Lint all packages
pnpm test:unit    # Run Vitest unit tests across all packages
```

## Documentation

- [Architecture](docs/architecture.md) — services, data model, auth flow, real-time messaging
- [Roadmap](docs/roadmap.md) — implementation phases and acceptance criteria
