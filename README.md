# WorkPilot AI — Agentic Work Intake & Execution Prototype

An agentic AI work-intake and execution platform built with Next.js, TypeScript, Tailwind CSS, PostgreSQL, Prisma ORM, and the OpenAI API.

WorkPilot AI converts unstructured requests (emails, meeting notes, slack messages) into structured interpretations, deterministic action plans, bounded tool executions, human-in-the-loop approvals, and audit trails.

---

## 🚀 Key Architecture & Features

1. **AI Structured Interpretation**: Extracts title, summary, priority level, detected deadlines, missing information, automatable candidates, and required human confirmation.
2. **Agentic Action Routing**: Routes action items deterministically to one of 4 routes:
   - `EXECUTE_AUTOMATICALLY` (emerald badge)
   - `PREPARE_FOR_HUMAN_REVIEW` (amber badge)
   - `CANNOT_EXECUTE` (rose badge)
   - `REQUIRES_CLARIFICATION` (sky badge)
3. **Bounded Tool System**: Registered tools (`create_task`, `draft_communication`, `generate_brief`, `website_check`) with SSRF protection and input validation.
4. **Human-in-the-Loop (HITL) Governance**: Automatically pauses external communications at `WAITING_FOR_APPROVAL`. Supports draft inspection, inline editing, reviewer notes, approval state transition, and execution resumption.
5. **Persisted Activity Trace**: Complete system audit trail saved to PostgreSQL (`ActivityEvent`).
6. **Full-Stack Operations Workbench**: Interactive UI with scenario preset buttons, visual step indicators, draft editor, artifact viewer, and work history.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router, React 19)
- **Language**: TypeScript (Strict mode)
- **Styling**: Tailwind CSS v4
- **Database**: PostgreSQL 16
- **ORM**: Prisma ORM v5
- **AI Engine**: OpenAI SDK (`gpt-4o-mini`) + Zod Schema Validation
- **Testing**: Vitest v3 (68 tests)

---

## 💻 Local Development Setup

### 1. Prerequisites
- Node.js v20+
- Docker & Docker Compose (for local PostgreSQL)

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env` and configure your settings:
```bash
cp .env.example .env
```
Fill in your `OPENAI_API_KEY`:
```env
DATABASE_URL="postgresql://workpilot:workpilot_pass@localhost:5432/workpilot_db?schema=public"
OPENAI_API_KEY="your-openai-api-key-here"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Start PostgreSQL Container
```bash
docker compose up postgres -d
```

### 5. Initialize Database Schema & Seed Data
```bash
npx prisma db push
npm run db:seed
```

### 6. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Running Tests & Build Verification

```bash
# Run Vitest Unit, Integration & E2E Tests (68 tests)
npm run test

# Run TypeScript Compilation Check
npx tsc --noEmit

# Run ESLint Audit
npm run lint

# Run Production Build
npm run build

# Start Local Production Server
npm run start
```

---

## 🐳 Docker Deployment

To run the complete production application and database in Docker:

```bash
docker compose up --build -d
```

Access the application at `http://localhost:3000`.

---

## 🌐 Production Deployment Guide (Vercel / Cloud)

### 1. Environment Variables
Set the following environment variables in your deployment platform settings:
- `DATABASE_URL`: Managed PostgreSQL connection string
- `OPENAI_API_KEY`: Production OpenAI API key
- `NEXT_PUBLIC_APP_URL`: Production application URL

### 2. Database Migration
Run database migrations against your production database:
```bash
npx prisma migrate deploy
```

### 3. Build & Deploy
Deploy to Vercel or your preferred cloud provider. The build command will automatically run `next build`.

---

## 📊 Health & Readiness Probes

- **Liveness Probe**: `GET /api/health` — Returns `200 OK` `{ status: "ok", service: "workpilot-ai" }`
- **Readiness Probe**: `GET /api/ready` — Returns `200 OK` `{ status: "ready", database: "connected" }`
