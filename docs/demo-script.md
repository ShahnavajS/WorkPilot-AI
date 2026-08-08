# 5-Minute Technical Demonstration Script — WorkPilot AI

**Target Audience**: Engineering Evaluators & Hiring Team  
**Total Duration**: ~5 Minutes  
**Live URL**: `http://localhost:3000` (Production Build / Docker Container)

---

## 🕒 0:00–0:30 — Introduction & Core Concept

**Screen**: Open WorkPilot AI Operations Workbench (`http://localhost:3000`)

**Speaker Script**:
> "Hi everyone, welcome to WorkPilot AI. WorkPilot is an AI-native work-intake and execution prototype built with Next.js 15, TypeScript, PostgreSQL, Prisma, and OpenAI. 
> 
> Unlike generic chatbots that stream unvalidated text or execute unconstrained code, WorkPilot turns unstructured requests into validated JSON interpretations, routes actions through an agentic planner, executes bounded tools, pauses for human-in-the-loop approval, and logs an immutable audit trail in PostgreSQL."

---

## 🕒 0:30–1:15 — Scenario 1 Intake & AI Structured Interpretation

**Action**: Click the **"Scenario 1 — Routine Business Work"** preset button and click **"Analyze Work"**.

**Speaker Script**:
> "Let's start with a multi-step business request: *'Summarize our partner discussion, extract follow-ups, draft a thank-you email, and set a 7-day reminder.'*
> 
> Notice what happens immediately: the request passes through our OpenAI interpreter engine and is validated with Zod. It produces a structured interpretation card displaying a title, summary, `HIGH` priority, and 3 distinct action items. Notice that no information is invented — if details are missing, the system notes it explicitly."

---

## 1:15–2:00 — Agentic Planning & Action Routing

**Screen**: Scroll to the **Agentic Execution Plan & Routing** panel.

**Speaker Script**:
> "Here is our Agentic Planner in action. The planner takes the validated action items and routes each one to an explicit route:
> 1. Step 1 (Summarize discussion): Routed to `EXECUTE_AUTOMATICALLY` using our `generate_brief` tool.
> 2. Step 2 (Draft thank-you email): Routed to `PREPARE_FOR_HUMAN_REVIEW` using `draft_communication`.
> 3. Step 3 (Set reminder): Routed to `EXECUTE_AUTOMATICALLY` using `create_task`.
> 
> Crucially, the planner *never* executes tools itself. It only determines the execution route and tool mapping."

---

## 2:00–2:45 — Tool Execution & Human Approval Gate

**Action**: Click **"Start Execution"**. Watch Step 1 execute automatically and Step 2 pause at the Human Approval card.

**Speaker Script**:
> "Now I'll click **Start Execution**. Step 1 executes the `generate_brief` tool and creates a Markdown summary brief artifact in PostgreSQL. 
> 
> Step 2 runs `draft_communication` to generate an email draft, but because external communications carry real-world consequences, the state machine automatically pauses execution at `WAITING_FOR_APPROVAL`. Notice the amber Human Approval Gate card."

---

## 2:45–3:30 — HITL Editing, Approval & Resumption

**Action**: Click **"Edit Content"**, modify the draft body text to say *"Thank you for speaking with our executive team..."*, enter reviewer note *"Tone alignment"*, and click **"Approve Edited Version"**.

**Speaker Script**:
> "As a human operator, I can review the draft, toggle inline edit mode, and adjust the wording for partner alignment. 
> 
> When I click **Approve Edited Version**, the database updates the `Approval` record to `APPROVED`, writes the edited text to the persisted `Artifact` while keeping the original content for auditing, and automatically resumes execution. Step 3 then creates the 7-day reminder task, bringing the overall status to `COMPLETED`."

---

## 3:30–4:00 — Artifacts, Activity Trace & Persistence

**Action**: Highlight the **Generated Work Artifacts** tab viewer and scroll down to the **Activity Trace & Audit Log**. Then refresh the browser (`F5`).

**Speaker Script**:
> "Here in the workbench, we can view all generated artifacts — the markdown brief, the email draft, and task items. Below is our real-time audit trail, recording every event from intake to completion.
> 
> If I refresh the browser, the entire state is reloaded directly from PostgreSQL. There are no transient memory variables that disappear."

---

## 4:00–4:30 — Scenario 3 Ambiguity & Unsafe Execution Prevention

**Action**: Click **"+ New Work Request"**, click **"Scenario 3 — Ambiguous Request"** preset (*"Please take care of the documentation and send it to everyone before the meeting."*), and click **"Analyze Work"**.

**Speaker Script**:
> "Now let's test ambiguity governance. I'll submit: *'Please take care of the documentation and send it to everyone before the meeting.'*
> 
> The interpreter flags missing facts: recipients unknown, document unspecified, meeting time unknown. The planner routes the actions to `REQUIRES_CLARIFICATION`. 
> 
> When we attempt execution, zero tools are run. The workflow stops safely in `NEEDS_CLARIFICATION` and alerts the user. WorkPilot never invents recipients or pretends an unsupported email-sending tool exists."

---

## 4:30–5:00 — Architecture Summary & Technical Wrap-Up

**Screen**: Return to top of Workbench or show architecture overview in README.

**Speaker Script**:
> "To summarize our technical architecture:
> - Next.js 15 App Router & TypeScript full-stack structure
> - PostgreSQL database storing 10 domain models with full transactional consistency
> - Zod-validated OpenAI structured outputs
> - Deterministic state machine with 6 execution states
> - 68 passing automated unit, integration, and E2E tests
> 
> Thank you for reviewing WorkPilot AI!"

---

## 🎥 Fallback Verification Evidence

If live external OpenAI API or network access is unavailable during presentation:
- Reference [`tests/evidence/live-deployment.md`](file:///c:/Users/sanus/Desktop/Altibbé%20Assignment/tests/evidence/live-deployment.md)
- Reference [`tests/evidence/scenario-1.md`](file:///c:/Users/sanus/Desktop/Altibbé%20Assignment/tests/evidence/scenario-1.md)
- Reference [`tests/evidence/scenario-2.md`](file:///c:/Users/sanus/Desktop/Altibbé%20Assignment/tests/evidence/scenario-2.md)
- Reference [`tests/evidence/scenario-3.md`](file:///c:/Users/sanus/Desktop/Altibbé%20Assignment/tests/evidence/scenario-3.md)
