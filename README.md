# WorkPilot AI — Agentic Work Intake & Execution Prototype

An agentic AI work-intake and execution platform built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, **PostgreSQL**, **Prisma ORM**, and the **OpenAI API**.

WorkPilot AI converts unstructured, informal work requests (meeting notes, slack messages, emails) into validated structured interpretations, deterministic action plans, bounded tool executions, human-in-the-loop approvals, and immutable audit trails in PostgreSQL.

---

## 🎯 What It Does

WorkPilot AI addresses the core reliability challenges of traditional LLM wrappers:
1. **Zero Hallucinated Actions**: The AI interpreter parses raw text into structured JSON validated against strict Zod schemas. If information is missing, the system notes it explicitly rather than fabricating data.
2. **Deterministic Agentic Planning**: An agentic planner maps action items to explicit execution routes (`EXECUTE_AUTOMATICALLY`, `PREPARE_FOR_HUMAN_REVIEW`, `CANNOT_EXECUTE`, `REQUIRES_CLARIFICATION`) and selects bounded tools without executing them directly.
3. **Human-in-the-Loop (HITL) Governance**: Consequential actions (such as communication drafts) automatically pause execution at a `WAITING_FOR_APPROVAL` boundary. Human operators can inspect, inline-edit, approve, or reject draft content before execution resumes.
4. **State Machine & Persistent Audit Trail**: Workflows advance through explicit state machine transitions backed by 10 PostgreSQL database models. Every event is saved to an immutable `ActivityEvent` trace.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    User([User / Human Operator]) <-->|Workbench UI| NextJS[Next.js 15 Full-Stack App]
    
    subgraph AI Engine Layer
        NextJS -->|POST /api/intake| Interpreter[AI Structured Interpreter]
        Interpreter -->|Zod Validation| StructInterp[(Structured Interpretation)]
        StructInterp -->|POST /api/plan| Planner[Agentic Action Planner]
        Planner -->|Validate Safety Rules| ExecPlan[(Execution Plan)]
    end

    subgraph State Machine & Execution Layer
        ExecPlan -->|POST /api/.../execute| Executor[Workflow Executor]
        Executor --> StateMachine{State Machine Guard}
        
        StateMachine -->|AUTO EXECUTE| ToolReg[Tool Registry]
        StateMachine -->|HUMAN REVIEW| HITLGate[Human Approval Gate]
        StateMachine -->|AMBIGUOUS| Clarification[NEEDS_CLARIFICATION]
        
        HITLGate <-->|Review / Inline Edit / Approve| User
        HITLGate -->|Resumption| ToolReg
    end

    subgraph Tool Capabilities
        ToolReg --> TaskTool[create_task]
        ToolReg --> DraftTool[draft_communication]
        ToolReg --> BriefTool[generate_brief]
        ToolReg --> WebTool[website_check]
    end

    subgraph PostgreSQL Persistence Layer
        Executor -->|Persist State & Artifacts| DB[(PostgreSQL Database)]
        ToolReg -->|Store ToolExecutions| DB
        HITLGate -->|Store Approvals| DB
        DB -->|Audit Trace| ActivityTrace[ActivityEvent Trail]
    end
```

---

## 🧩 Core Workflow Stages

```
User Input ──► Interpretation ──► Zod Validation ──► Action Routing ──► Tool Execution ──► HITL Approval ──► Resumption ──► Completion
```

1. **Intake & Interpretation**: Accepts raw unstructured text and runs OpenAI `gpt-4o-mini` with structured JSON output.
2. **Schema Validation**: Validates model output against `InterpretationResultSchema`. Fails safely if invalid.
3. **Action Routing**: Maps extracted action items to registered capability tools and assigns execution safety routes.
4. **Tool Execution**: Sequentially executes bounded tools for `EXECUTE_AUTOMATICALLY` steps and persists output artifacts.
5. **Human Approval Gate**: Pauses workflow at `PREPARE_FOR_HUMAN_REVIEW` steps. Renders draft editor in UI.
6. **Resumption & Completion**: Resumes execution upon approval resolution and marks request `COMPLETED`.

---

## 🤖 Agentic Design: Interpreter vs Planner vs Executor vs Tools

To ensure safety, testability, and deterministic behavior, WorkPilot AI cleanly decouples AI intelligence from execution authority:

- **Interpreter ("What does the user want?")**: Analyzes unstructured text to extract title, summary, priority, deadlines, missing facts, and discrete action items. *Does not plan or execute tools.*
- **Planner ("How should each action be handled?")**: Evaluates action items against registered tool capabilities and assigns safety routes (`AUTO EXECUTE`, `HUMAN REVIEW`, `CANNOT EXECUTE`, `NEEDS CLARIFICATION`). *Does not execute tools or perform side effects.*
- **Executor ("Which approved action should run?")**: Sequential state machine that manages workflow transitions (`PLANNED` → `IN_PROGRESS` → `WAITING_FOR_APPROVAL` → `COMPLETED`). *Calls tool handlers and handles approval pause boundaries.*
- **Tools ("Perform one bounded operation")**: Discrete, isolated functions with strict input validation that perform specific operations (`create_task`, `draft_communication`, `generate_brief`, `website_check`).

---

## 💡 Why Structured Output is Used

WorkPilot AI employs OpenAI Structured Outputs combined with Zod schema validation:

```
LLM Output ──► Zod Schema Validation ──► Deterministic Safety Validator ──► Database Action
```

- **Eliminates Arbitrary Code Execution**: The LLM cannot execute raw code or invent non-existent APIs.
- **Enforces Safety Guards**: If an LLM returns candidate steps that violate safety rules (e.g. attempting to send external emails automatically), `validateAndEnforcePlanSafety` overrides the route to `PREPARE_FOR_HUMAN_REVIEW`.
- **Testable & Deterministic**: Mocking structured outputs in test suites ensures 100% deterministic test execution.

---

## 🧰 Tool Registry & Capabilities

| Tool Name | Purpose | Input Schema | Side Effect | HITL Review |
| :--- | :--- | :--- | :--- | :--- |
| `create_task` | Create persistent action item task | `description`, `priority`, `dueAt`, `actionType` | DB ActionItem Write | No |
| `draft_communication` | Draft reviewable communication | `recipient`, `communicationType`, `topic`, `keyPoints` | DB `COMMUNICATION_DRAFT` Artifact (`status: DRAFT_ONLY`) | **Yes** |
| `generate_brief` | Generate Markdown summary brief | `title`, `summary`, `actionItems` | DB `MARKDOWN_BRIEF` Artifact | No |
| `website_check` | Perform bounded website inspection | `url` (HTTP/HTTPS) | Bounded Network Read + DB `WEBSITE_REPORT` Artifact | No |

---

## 🌐 Website Check Scope & Honest Disclaimers

The `website_check` tool performs a real, bounded inspection:
- [x] URL syntax validation & HTTP/HTTPS protocol enforcement
- [x] SSRF Protection: Blocks `localhost`, `127.0.0.1`, private subnets (`10.x`, `192.168.x`, `172.16-31.x`), non-HTTP schemes
- [x] Response latency probe & HTTP status code verification (`200 OK`)
- [x] HTML title tag & meta description extraction
- [x] 10,000ms AbortController timeout & 500KB response cap

> 🛑 **Honest Scope Disclaimer**: The prototype does **NOT** perform full security vulnerability scanning, Lighthouse performance scoring, WCAG accessibility auditing, or JavaScript rendering. Reports explicitly detail only the checks performed.

---

## 🛡️ Human-in-the-Loop (HITL) Governance

When an action item involves external communication (`draft_communication`):
1. The planner routes the step to `PREPARE_FOR_HUMAN_REVIEW`.
2. The executor generates a draft artifact (`status: DRAFT_ONLY`), creates a `PENDING` `Approval` record, and pauses the workflow in `WAITING_FOR_APPROVAL`.
3. The Workbench UI displays the **Human Approval Required** card with the generated draft.
4. Human operators can:
   - Click **Approve Draft**: Grants approval as-is.
   - Click **Edit Content**: Toggles an inline font-mono text editor to adjust wording before approving.
   - Click **Reject Request**: Rejects the step and halts workflow execution safely.
5. Granting approval updates `Approval` to `APPROVED`, writes the edited text to the persisted `Artifact` while preserving original content for auditability, and automatically resumes execution.

---

## ⚠️ Safety Boundaries & Ambiguity Governance

- **Unsupported Actions**: Requests for unsupported capabilities (e.g. *"Send an SMS"*) are routed to `CANNOT_EXECUTE` and step status set to `SKIPPED`.
- **Ambiguous Requests**: Requests missing required information (e.g. *"Take care of the documentation and send it to everyone"*) are routed to `REQUIRES_CLARIFICATION`. **0 tools are executed**, and the request stops safely in `NEEDS_CLARIFICATION`.
- **Double Execution Protection**: Calling `POST /api/work-requests/[id]/execute` twice skips completed steps and prevents duplicate task creation or tool re-runs.

---

## 📋 Required Demonstration Scenarios

### Scenario 1 — Routine Business Work
- **Input**: *"Summarize a partner discussion, extract follow-ups, draft a thank-you email, and set a 7-day reminder."*
- **Outcome**: Summary brief generated, draft email created, workflow paused at HITL approval gate, edited & approved by user, 7-day reminder task created, reached `COMPLETED`. Evidence: [`tests/evidence/scenario-1.md`](file:///c:/Users/sanus/Desktop/Altibbé%20Assignment/tests/evidence/scenario-1.md)

### Scenario 2 — HEDAMO Website Review
- **Input**: *"Review hedamo.com, run whatever automated checks your prototype actually supports, and produce a short technical report."*
- **Outcome**: Bounded website check executed against `https://hedamo.com`, status `200 OK`, latency `142 ms`, HTML title extracted, `WEBSITE_REPORT` generated. Evidence: [`tests/evidence/scenario-2.md`](file:///c:/Users/sanus/Desktop/Altibbé%20Assignment/tests/evidence/scenario-2.md)

### Scenario 3 — Ambiguous Request
- **Input**: *"Please take care of the documentation and send it to everyone before the meeting."*
- **Outcome**: Missing information identified (`Recipients missing`, `Target document missing`). Actions routed to `REQUIRES_CLARIFICATION`. 0 tools executed, workflow stopped safely in `NEEDS_CLARIFICATION`. Evidence: [`tests/evidence/scenario-3.md`](file:///c:/Users/sanus/Desktop/Altibbé%20Assignment/tests/evidence/scenario-3.md)

---

## 💻 Tech Stack & Project Structure

```text
├── app/                      # Next.js 15 App Router Routes & API Handlers
│   ├── api/
│   │   ├── approvals/        # Approval resolution endpoints (approve, reject, edit-approve)
│   │   ├── health/           # Liveness probe GET /api/health
│   │   ├── intake/           # Intake & AI Structured Interpretation POST /api/intake
│   │   ├── plan/             # Agentic Planning POST /api/plan
│   │   ├── ready/            # Readiness probe GET /api/ready
│   │   └── work-requests/    # Work request execution & list endpoints
│   ├── layout.tsx            # Global layout shell
│   └── page.tsx              # Workbench root page
├── components/               # React UI Components
│   ├── ActivityTimeline.tsx  # Chronological ActivityEvent audit trail
│   ├── ApprovalPanel.tsx     # HITL Review Gate card with inline draft editor
│   ├── ArtifactViewer.tsx    # Selectable viewer for drafts, briefs & reports
│   ├── ClarificationPanel.tsx# Ambiguity & missing facts alert card
│   ├── ExecutionPlanPanel.tsx# Routing decision badges & tool controls
│   ├── InterpretationPanel.tsx# AI interpretation summary & action items
│   ├── Workbench.tsx         # Master state orchestrator & client container
│   ├── WorkHistory.tsx       # Sidebar navigation for past work requests
│   ├── WorkRequestInput.tsx  # Textarea with scenario preset buttons
│   └── WorkflowProgress.tsx  # 6-stage lifecycle progress header
├── docs/                     # Engineering & Deployment Documentation
│   ├── demo-script.md        # 5-Minute Technical Demonstration Script
│   ├── deployment-checklist.md # Production deployment guide
│   └── final-submission-checklist.md # Final submission checklist
├── lib/                      # Core Server & Business Logic
│   ├── ai/                   # Interpreter, Planner, Zod Schemas & Prompts
│   ├── config/               # Server environment validator (env.ts)
│   ├── db/                   # Prisma client singleton & persistence primitives
│   ├── engine/               # State machine executor & approval handlers
│   ├── tools/                # Capability registry & tool implementations
│   └── utils/                # Standardized API response helpers
├── prisma/                   # Database Schema & Migrations
│   ├── schema.prisma         # 10 Domain models & 9 Enums
│   └── seed.ts               # Dev seed script
├── tests/                    # Vitest Test Suite (68 tests)
│   ├── evidence/             # Scenario 1, 2, 3 & Live verification evidence
│   ├── executor.test.ts      # State machine & executor tests
│   ├── health.test.ts        # Health & readiness probe tests
│   ├── integration.test.ts   # End-to-end scenario integration tests
│   ├── interpreter.test.ts   # AI structured interpretation tests
│   ├── persistence.test.ts   # Persistence layer tests
│   ├── planner.test.ts       # Agentic planner & action routing tests
│   ├── tools.test.ts         # Real tool execution & SSRF safety tests
│   └── ui.test.ts            # UI component & payload tests
├── Dockerfile                # Multi-stage production Docker build
├── docker-compose.yml        # Docker compose stack (App + PostgreSQL)
└── README.md                 # Project README
```

---

## ⚡ Quick Start & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Configure your `OPENAI_API_KEY`:
```env
DATABASE_URL="postgresql://workpilot:workpilot_pass@localhost:5432/workpilot_db?schema=public"
OPENAI_API_KEY="your-openai-api-key-here"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Start PostgreSQL Database
```bash
docker compose up postgres -d
```

### 4. Push Schema & Run Dev Server
```bash
npx prisma db push
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Build Commands

```bash
# Run Vitest Unit, Integration & E2E Tests (68 tests passing)
npm run test

# Run TypeScript Type Check
npx tsc --noEmit

# Run ESLint Audit
npm run lint

# Production Build
npm run build

# Start Local Production Server
npm run start
```

---

## 🐳 Docker Deployment

To run the complete production application and database stack in Docker:

```bash
docker compose up --build -d
```

Access the deployed application at `http://localhost:3000`.

---

## 🏛️ Engineering Design Decisions & Known Limitations

### Design Decisions
1. **Sequential State Machine Execution**: Chosen over complex DAG engines to keep state transitions deterministic, persistent, and easy to explain.
2. **Transactional Database Persistence**: State, step progress, approvals, artifacts, and activity events are saved transactionally to PostgreSQL. Workflows can safely resume after browser refresh or process restarts.
3. **Explicit Capability Tool Registry**: Tools are isolated, typed functions with strict input validation, preventing unstructured LLM function execution.

### Intentional Assignment Boundaries
1. **Communication Boundary (`DRAFT_ONLY`)**: Drafts are created and stored in PostgreSQL for human approval. No real external emails are sent.
2. **Bounded Network Inspection**: `website_check` performs basic HTTP probing and metadata extraction. No full browser rendering or vulnerability scanning.
3. **Authentication Scope**: Authentication was omitted per assignment guidelines to focus on core agentic execution and state governance.
