# Kalehub — Architecture

## Overview

Kalehub is a three-service TypeScript monorepo. Each service is independently containerised and communicates through well-defined interfaces: HTTP REST, WebSocket, and Redis pub/sub. The architecture is designed to run entirely in Docker Compose locally and migrate to AWS ECS with minimal friction.

---

## Service Topology

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│                                                             │
│   REST (fetch)          WebSocket (socket.io-client)        │
└──────────┬──────────────────────────┬───────────────────────┘
           │                          │
           ▼                          ▼
    ┌─────────────┐           ┌───────────────┐
    │  apps/api   │           │   apps/ws     │
    │  Fastify    │           │  Socket.io    │
    │  Port 3001  │           │  Port 3002    │
    └──────┬──────┘           └───────┬───────┘
           │ Prisma                   │ Redis subscribe
           │                          │ (psubscribe "conversation:*")
           ▼                          │
    ┌─────────────┐           ┌───────┴───────┐
    │  PostgreSQL │           │    Redis      │
    │  Port 5432  │           │  Port 6379    │
    └─────────────┘           └───────────────┘
           ▲
           │ Prisma (User upsert on login)
    ┌──────┴──────┐
    │  apps/web   │
    │  Next.js 15 │
    │  Port 3000  │
    └──────┬──────┘
           │ OIDC (redirect)
    ┌──────┴──────┐
    │  Keycloak   │
    │  Port 8080  │
    └─────────────┘
```

---

## Authentication Flow

Keycloak owns all user credentials. The application never handles passwords.

```
1. User clicks "Sign in" on the web app
2. Auth.js redirects to Keycloak login/registration page
3. User authenticates with Keycloak (username/password, social, etc.)
4. Keycloak redirects back to Auth.js with an OIDC authorisation code
5. Auth.js exchanges the code for tokens, fetches the Keycloak userinfo endpoint
6. Auth.js jwt callback:
     - Upserts a User row in Postgres (keycloakId = profile.sub, email, name)
     - Embeds our internal userId (cuid) into the session JWT payload
7. Auth.js issues its own session JWT signed with AUTH_SECRET
8. The session JWT is exposed as session.accessToken for client-side use
```

### Why not forward Keycloak tokens directly?

The `api` and `ws` services verify tokens using only `AUTH_SECRET` (via `jose`). They never need to talk to Keycloak or know its public keys. This keeps the verification path simple and identical across services, and decouples service auth from Keycloak's key rotation.

---

## Real-Time Message Flow

Messages are sent via REST and delivered in real time via WebSocket. The two concerns are deliberately separated.

```
Browser (Sender)
  │
  │  POST /conversations/:id/messages
  │  Authorization: Bearer <Auth.js session JWT>
  ▼
apps/api (Fastify)
  1. Verify JWT → extract userId
  2. Assert sender is a ConversationParticipant
  3. INSERT Message into PostgreSQL via Prisma
  4. PUBLISH to Redis channel "conversation:<id>"
     payload: { id, conversationId, senderId, content, createdAt }
  5. Return 201 with the persisted message (sender's UI confirms delivery)
  │
  │  Redis pub/sub
  ▼
apps/ws (Socket.io)
  1. psubscribe("conversation:*") receives the event
  2. io.to("conversation:<id>").emit("message:new", payload)
  │
  ▼
Browser (Recipient)
  socket.on("message:new") → append message to UI
```

### Why REST for sending?

- The HTTP response gives the sender a confirmed message ID immediately (no client-side GUID needed)
- Error handling is explicit (HTTP status codes)
- The WS service remains write-stateless — it only broadcasts, never persists

### Socket.io Room Strategy

Each conversation maps to a Socket.io room named `conversation:<conversationId>`. Clients join a room by emitting `conversation:join`. The server verifies the requesting user is a `ConversationParticipant` before calling `socket.join()`.

The `@socket.io/redis-adapter` is wired from day one. It synchronises room membership across multiple WS instances, making horizontal scaling on ECS a configuration change rather than a refactor.

### WebSocket Authentication

JWT verification runs in the Socket.io `io.use()` middleware — once per connection, before any event handlers fire:

```typescript
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token  // set by client from session.accessToken
  try {
    const { payload } = await jwtVerify(token, secret)
    socket.data.userId = payload.sub
    next()
  } catch {
    next(new Error('unauthorized'))
  }
})
```

---

## Data Model

```
┌───────────────────┐       ┌──────────────────────────┐
│       User        │       │  ConversationParticipant  │
│ ─────────────── │       │ ──────────────────────── │
│ id (cuid)         │◄──────│ userId                    │
│ email             │       │ conversationId            │
│ name              │       │ joinedAt                  │
│ keycloakId        │       └──────────┬───────────────┘
│ createdAt         │                  │
│ updatedAt         │                  ▼
└─────────┬─────────┘       ┌──────────────────────────┐
          │                 │       Conversation        │
          │                 │ ──────────────────────── │
          │                 │ id (cuid)                 │
          │                 │ createdAt                 │
          │                 │ updatedAt                 │
          │                 └──────────┬───────────────┘
          │                            │
          │  ┌─────────────────────────┘
          │  │
          ▼  ▼
    ┌──────────────────┐
    │     Message      │
    │ ─────────────── │
    │ id (cuid)        │
    │ conversationId   │
    │ senderId         │
    │ content          │
    │ createdAt        │
    │ editedAt         │
    └──────────────────┘
```

### Design decisions

- **`keycloakId` not `passwordHash`** — Keycloak owns credentials. `keycloakId` is the Keycloak `sub` claim, populated on first OIDC login.
- **`ConversationParticipant` as a join table** — not a simple `[userId, userId]` pair on `Conversation`. This makes adding group chats a zero-schema-change operation and allows per-participant metadata (last-read cursor, muted state) in future migrations.
- **`Message` index on `(conversationId, createdAt)`** — supports efficient cursor-based pagination for chat history (`WHERE conversationId = ? AND createdAt < ?`).

---

## API Design (Domain-Driven)

The API is organised by domain, not by technical layer. Each domain is self-contained and can be extracted into a separate service independently.

```
apps/api/src/
├── server.ts                    # Fastify app factory
├── index.ts                     # Entry point
├── plugins/                     # Cross-cutting Fastify plugins
│   ├── jwt.ts                   # authenticate preHandler decorator
│   ├── redis.ts                 # ioredis plugin
│   └── cors.ts
├── domains/
│   ├── user/
│   │   ├── user.routes.ts       # Thin handlers — validate, call service, translate errors
│   │   ├── user.service.ts      # Business logic — framework-agnostic
│   │   ├── user.repository.ts   # IUserRepository + PrismaUserRepository
│   │   └── user.types.ts        # Zod schemas + domain interfaces
│   ├── conversation/
│   │   └── ...
│   └── message/
│       └── ...
└── shared/
    ├── errors.ts                # NotFoundError, ForbiddenError, ConflictError
    └── pagination.ts            # Cursor pagination helpers
```

**Repository pattern**: services depend on `IXxxRepository` interfaces, not the Prisma client directly. This isolates the data layer, enables mocking in unit tests without a database connection, and makes the data boundary explicit.

**Service layer is framework-agnostic**: services accept plain objects and throw domain errors. Routes catch domain errors and translate them to HTTP status codes.

**REST routes (v1):**

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/conversations` | List conversations for the authenticated user |
| `POST` | `/conversations` | Create a DM `{ participantId }` |
| `GET` | `/conversations/:id/messages` | Paginated message history (`?before=<ISO>&limit=50`) |
| `POST` | `/conversations/:id/messages` | Send a message — persists and publishes to Redis |

---

## Monorepo and Build System

**Turborepo task graph:**

```
build      dependsOn: ["^build"]  outputs: [dist/**, .next/**]
typecheck  dependsOn: ["^build"]
test:unit  dependsOn: ["^build"]
lint       (no dependsOn — runs fully in parallel)
dev        cache: false, persistent: true
```

`^build` means "build all workspace dependencies first". When building `apps/api`, Turborepo builds `packages/types` and `packages/db` first automatically.

**Shared packages:**

| Package | Purpose |
|---|---|
| `@kalehub/types` | TypeScript interfaces shared across all services (`UserDTO`, `MessageDTO`, `ServerToClientEvents`, etc.) |
| `@kalehub/db` | Prisma schema, generated client, and a singleton `prisma` instance |

---

## Docker Strategy

### Development

Dev Dockerfiles (`Dockerfile.dev`) install all dependencies and start the service in watch mode. Source code is bind-mounted via `docker-compose.override.yml` so edits on the host are reflected immediately — no rebuild required.

- `apps/api` and `apps/ws`: `tsx watch` (fast TypeScript execution without a compile step)
- `apps/web`: Next.js built-in fast refresh

### Production

Prod Dockerfiles (`Dockerfile.prod`) use four stages:

| Stage | Purpose |
|---|---|
| `deps` | `pnpm install --frozen-lockfile` — cached when lockfile is unchanged |
| `builder` | `tsc` / `next build` — cached when source is unchanged |
| `tester` | `vitest run` — CI builds to this target; exits non-zero if tests fail |
| `runner` | Minimal Alpine image, non-root `appuser`, only compiled output copied in |

The `web` runner uses Next.js `output: 'standalone'` which bundles all required Node modules into a self-contained directory.

### CI Cache Strategy

CI uses Docker BuildKit with `type=gha` (GitHub Actions cache) for layer caching. This means:
- `pnpm install` is only re-executed when `pnpm-lock.yaml` changes
- Compilation is only re-executed when source files change
- No external registry is needed for the cache

When AWS credentials are added, the cache backend migrates to `type=registry` pointing at ECR — a one-line change per job that gives more persistent caching co-located with the deployment target.

---

## AWS Future State

| Local | AWS |
|---|---|
| Docker containers | ECS Fargate tasks |
| Keycloak container | ECS Fargate task |
| postgres container | RDS PostgreSQL 16 (Multi-AZ) — two databases: app + keycloak |
| redis container | ElastiCache Redis 7 (cluster mode) |
| Docker images | ECR (one repository per service) |
| Routing | ALB with host-based routing per service |

All ECS tasks run in private subnets. The ALB is in public subnets. RDS and ElastiCache only accept traffic from ECS security groups.

The WS service target group has sticky sessions enabled (for the Socket.io handshake). The `@socket.io/redis-adapter` handles cross-instance message delivery once stickiness is established.

Infrastructure as code: **Terraform** in `infra/`, with reusable HCL modules per service. This is a future phase and not yet implemented.
