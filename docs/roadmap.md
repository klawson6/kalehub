# Kalehub — Roadmap

Implementation broken into seven incremental phases. Each phase has a clear goal and acceptance criteria that can be verified before moving to the next.

---

## Phase 1 — Monorepo Scaffold + Docker Compose ✅

**Goal:** `docker compose up` starts all six containers; each returns a health response. The full build and typecheck pipeline passes.

**Delivered:**
- pnpm workspaces + Turborepo with parallel task execution
- `packages/types` — shared TypeScript DTOs and Socket.io event types
- `packages/db` — Prisma schema (User, Conversation, ConversationParticipant, Message), generated client
- `apps/api` — Fastify skeleton with `/health`, DDD directory layout, shared error classes
- `apps/ws` — Socket.io + HTTP health server skeleton
- `apps/web` — Next.js 15 App Router skeleton
- Dev Dockerfiles with source bind-mounts and hot reload
- Prod Dockerfiles: four-stage `deps → builder → tester → runner` with non-root user
- `docker-compose.yml` + `docker-compose.override.yml` with health checks
- Keycloak realm auto-import (`keycloak/realm-export.json`)
- `scripts/init-db.sh` — creates the `keycloak` database on postgres first boot

**Acceptance criteria (met):**
- `pnpm turbo run build` — 5/5 packages build successfully
- `pnpm turbo run typecheck` — 5/5 packages typecheck cleanly

---

## Phase 2 — Authentication (Keycloak + Auth.js)

**Goal:** Users authenticate via Keycloak. Auth.js issues session JWTs. The API can verify them. The application never handles passwords.

**Key work:**
1. Configure Keycloak realm (`kalehub`) with a confidential OIDC client, user registration enabled. Export to `keycloak/realm-export.json` so `docker compose up` is fully self-contained.
2. Wire Auth.js v5 Keycloak provider in `apps/web/lib/auth.ts`.
   - `jwt` callback: upsert User row on first login (`keycloakId = profile.sub`), embed internal `userId` in the JWT.
   - `session` callback: expose `session.accessToken` (re-serialised Auth.js JWT) for use by `api` and `ws`.
3. `apps/web/app/api/auth/[...nextauth]/route.ts` — Auth.js route handler.
4. Sign-in page (`apps/web/app/(auth)/sign-in/page.tsx`) — button redirects to Keycloak; Keycloak renders the login/registration form.
5. `apps/api/src/plugins/jwt.ts` — Fastify `authenticate` preHandler using `jose` and `AUTH_SECRET`.

**Key files:**
- `packages/db` — first migration (User model with `keycloakId`)
- `apps/web/lib/auth.ts`
- `apps/web/app/api/auth/[...nextauth]/route.ts`
- `apps/web/app/(auth)/sign-in/page.tsx`
- `apps/api/src/plugins/jwt.ts`
- `apps/api/src/domains/user/`

**Acceptance criteria:**
- Clicking "Sign in" redirects to Keycloak login page
- After successful login, a User row is upserted in Postgres
- `POST /conversations` without JWT returns 401
- `POST /conversations` with a valid JWT returns 201

---

## Phase 3 — REST API (Conversations + Messages CRUD)

**Goal:** Full CRUD for conversations and messages behind JWT auth, following the DDD structure. Sending a message publishes to Redis.

**Routes:**

| Method | Path | Description |
|---|---|---|
| `GET` | `/conversations` | List conversations for the authenticated user |
| `POST` | `/conversations` | Create a DM `{ participantId }` |
| `GET` | `/conversations/:id/messages` | Paginated history (`?before=<ISO>&limit=50`) |
| `POST` | `/conversations/:id/messages` | Persist message + publish to Redis |

**Key files:**
- `packages/db` — migration for Conversation, ConversationParticipant, Message
- `apps/api/src/domains/conversation/{routes,service,repository,types}.ts`
- `apps/api/src/domains/message/{routes,service,repository,types}.ts`
- `apps/api/src/plugins/redis.ts`
- `apps/api/src/shared/pagination.ts`
- `packages/types/src/{conversation,message}.ts`

**Acceptance criteria:**
- `POST /conversations` with `{ participantId }` creates conversation + two participant rows
- `POST /conversations/:id/messages` persists the message and publishes `{ id, conversationId, senderId, content, createdAt }` to Redis channel `conversation:<id>`
- `GET /conversations/:id/messages` returns cursor-paginated results in descending order
- All routes return 401 without a valid JWT

---

## Phase 4 — WebSocket Service + Real-Time Delivery

**Goal:** Messages sent via REST appear in the recipient's browser in real time without polling.

**Key work:**
1. JWT middleware in `io.use()` — validates `socket.handshake.auth.token`, attaches `userId` to `socket.data`.
2. Redis subscriber (`psubscribe("conversation:*")`) — deserialises the payload and calls `io.to("conversation:<id>").emit("message:new", payload)`.
3. `conversation:join` handler — verifies the requesting user is a `ConversationParticipant` before calling `socket.join()`.
4. Client-side socket singleton (`apps/web/lib/socket.ts`) — uses `session.accessToken` as the auth token.
5. `useSocket` and `useConversation` hooks.

**Key files:**
- `apps/ws/src/server.ts` — JWT middleware + Redis adapter setup
- `apps/ws/src/lib/redis-subscriber.ts`
- `apps/ws/src/handlers/connection.ts`
- `packages/types/src/events.ts` — typed `ServerToClientEvents` / `ClientToServerEvents`
- `apps/web/lib/socket.ts`
- `apps/web/hooks/useSocket.ts`
- `apps/web/hooks/useConversation.ts`

**Acceptance criteria:**
- Two browser sessions as different users — User A sends, User B receives in real time
- Invalid JWT on connect results in `connect_error`
- Reconnecting re-joins the correct conversation rooms

---

## Phase 5 — Frontend Chat UI

**Goal:** A functional, styled chat interface using Tailwind CSS and shadcn/ui. Components are built story-first in Storybook before being wired into app pages.

**Key work:**
1. `(chat)` route group: sidebar layout + DM conversation page.
2. DM page is a React Server Component that fetches initial message history server-side (avoids client loading spinner), then passes data to the `ChatWindow` client component which subscribes to the socket for live updates.
3. shadcn/ui: install and configure. Tailwind CSS 4.

**Key components:**
- `components/chat/Sidebar.tsx` — conversation list
- `components/chat/ChatWindow.tsx` — message list + input (client component)
- `components/chat/MessageList.tsx`
- `components/chat/MessageInput.tsx`
- `components/chat/ConversationItem.tsx`

**Acceptance criteria:**
- Conversation list shows all conversations for the signed-in user
- Clicking a conversation loads message history
- Sending a message posts to REST and appears immediately (optimistic update)
- Incoming socket messages append in real time
- UI is usable at mobile viewport width
- All chat components render correctly in Storybook isolation

---

## Phase 6 — Testing

**Goal:** Unit and integration tests on api + ws; Storybook interaction tests on web components; Playwright E2E covering the golden path.

### Vitest (api + ws)

- **Unit:** service layer tests with mocked repositories (`IXxxRepository`)
- **Integration:** route tests via `fastify.inject()` against a real `kalehub_test` database, migrated fresh per suite

### Vitest (web)

- **Unit:** custom hooks (`useMessages`, `useSocket`) with mocked socket/fetch

### Storybook

- `@storybook/nextjs` framework
- Stories for all chat components with interaction tests using `@storybook/test` (`userEvent`, `expect`)
- CI: `build-storybook` then `test-storybook` via `@storybook/test-runner` (Chromium headless)

### Playwright E2E

- Golden path: sign in via Keycloak → open DM → send message → assert it appears in a second browser context as the recipient
- CI: `docker compose up -d` before Playwright, `docker compose down` after
- Chromium only in CI; Firefox and WebKit added locally

**Acceptance criteria:**
- `pnpm turbo run test:unit` passes across all packages
- Storybook test-runner passes for all story interaction tests
- Playwright golden path passes against the full Docker Compose stack

---

## Phase 7 — CI/CD Pipeline

**Goal:** Every PR runs the full test matrix. Failures are scoped per job. Docker BuildKit layer caching avoids redundant installs and compilations.

### Job graph

```
build-api   ─┐
build-ws    ─┤─ (parallel, Docker multi-stage, type=gha cache)
build-web   ─┘

lint        ─┐
typecheck   ─┘ (parallel, native pnpm + GHA pnpm cache)

test:storybook  (needs: build-web, typecheck)
test:e2e        (needs: build-api, build-ws, build-web)
                └─ docker compose up → Playwright → docker compose down
```

Unit tests run inside Docker (`tester` stage). Lint and typecheck run natively (faster without container overhead). E2E runs Playwright natively against a `docker compose up` stack.

**Cache migration path:** when AWS credentials are added, switch `type=gha` to `type=registry` pointing at ECR — one-line change per job, more persistent caching co-located with the deployment target.

**Acceptance criteria:**
- A type error in any package causes `typecheck` to fail on the PR
- An ESLint violation causes `lint` to fail
- A failing Vitest test in a prod Dockerfile `tester` stage causes the build job to fail
- Playwright golden path passes in CI
- Branch protection on `main` requires all jobs green

---

## Future Phases (post-v1)

- **Group channels** — `ConversationParticipant` join table already supports N participants; schema change is additive
- **File/image uploads** — S3-backed, pre-signed upload URLs from the API
- **Message reactions** — new `Reaction` model, real-time via existing pub/sub
- **Read receipts** — `lastReadAt` column on `ConversationParticipant`
- **AWS deployment** — Terraform in `infra/`, ECS Fargate, RDS, ElastiCache, ECR, ALB
- **Keycloak social login** — configure additional identity providers in Keycloak (GitHub, Google) without any application code changes
