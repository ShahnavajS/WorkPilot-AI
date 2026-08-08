# Production Deployment & Readiness Guide — WorkPilot AI

## 1. Overview

WorkPilot AI is built as a Next.js Full-Stack Application (App Router, Node.js 20, Prisma ORM, PostgreSQL, OpenAI SDK).

---

## 2. Environment Variables

The server validates required environment variables at runtime via Zod schema (`lib/config/env.ts`):

| Variable Name | Scope | Required | Description / Example |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Server | **Yes** | `postgresql://user:pass@host:5432/db?schema=public` |
| `OPENAI_API_KEY` | Server | **Yes** | OpenAI API key for interpretation & planning |
| `NEXT_PUBLIC_APP_URL` | Client/Server | No | `https://workpilot.yourdomain.com` (Default: `http://localhost:3000`) |
| `NODE_ENV` | Server | No | `production` \| `development` \| `test` |
| `PORT` | Server | No | `3000` |

> ⚠️ **Security Audit Note**: `DATABASE_URL` and `OPENAI_API_KEY` are purely server-side environment variables and are never prefixed with `NEXT_PUBLIC_` or bundled into client code.

---

## 3. Database Migration Workflow

In production, database migrations MUST be applied using non-destructive deployment:

```bash
# Production Migration Command
npx prisma migrate deploy
```

> 🛑 **DO NOT RUN** `prisma migrate dev` or `prisma migrate reset` in production environments.

---

## 4. Production Build & Execution

### Local / Standalone Node.js Build
```bash
# 1. Generate Prisma Client
npm run db:generate

# 2. Build Next.js Production Bundle
npm run build

# 3. Start Production HTTP Server
npm run start
```

### Docker Container Deployment
```bash
# Build and run container stack locally
docker compose up --build -d
```

---

## 5. Health & Readiness Probes

| Endpoint | Probe Type | Description | Expected Response |
| :--- | :--- | :--- | :--- |
| `GET /api/health` | Liveness | Verifies application process is running | `200 OK` `{ status: "ok" }` |
| `GET /api/ready` | Readiness | Probes PostgreSQL database via `prisma.$queryRaw` | `200 OK` (Ready) / `503 Service Unavailable` |

---

## 6. Deployment Target Compatibility (Vercel / Serverless)

- **PostgreSQL Persistence**: WorkPilot AI stores all state, interpretations, execution plans, step statuses, artifacts, and activity events in PostgreSQL. No persistent local disk storage is required.
- **Serverless Timeouts**: API route handlers execute structured calls to OpenAI and tools sequentially within typical 10–30s serverless request execution limits.
- **Prisma Client Singleton**: Prisma ORM connection caching (`lib/db/prisma.ts`) prevents connection exhaustion across hot-reloading and serverless invocation instances.
