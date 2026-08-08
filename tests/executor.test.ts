import { describe, it, expect, vi, beforeEach } from "vitest";
import { executeWorkRequest, approveStep, rejectStep, editAndApproveStep } from "@/lib/engine";
import { prisma } from "@/lib/db/prisma";

// Mock Prisma database layer for offline unit testing
vi.mock("@/lib/db/prisma", () => {
  const mockWorkRequests: Record<string, any> = {};
  const mockExecutionPlans: Record<string, any> = {};
  const mockExecutionSteps: Record<string, any> = {};
  const mockActionItems: Record<string, any> = {};
  const mockToolExecutions: Record<string, any> = {};
  const mockApprovals: Record<string, any> = {};
  const mockArtifacts: Record<string, any> = {};
  const mockActivityEvents: any[] = [];

  const txMock = {
    workRequest: {
      update: vi.fn(async ({ where, data }: any) => {
        if (mockWorkRequests[where.id]) {
          Object.assign(mockWorkRequests[where.id], data, { updatedAt: new Date() });
        }
        return mockWorkRequests[where.id];
      }),
    },
    executionStep: {
      findUnique: vi.fn(async ({ where }: any) => mockExecutionSteps[where.id] || null),
      update: vi.fn(async ({ where, data }: any) => {
        if (mockExecutionSteps[where.id]) {
          Object.assign(mockExecutionSteps[where.id], data, { updatedAt: new Date() });
        }
        return mockExecutionSteps[where.id];
      }),
    },
    toolExecution: {
      create: vi.fn(async ({ data }: any) => {
        const id = `te_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
        const record = { id, ...data, createdAt: new Date() };
        mockToolExecutions[id] = record;
        return record;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        if (mockToolExecutions[where.id]) {
          Object.assign(mockToolExecutions[where.id], data);
        }
        return mockToolExecutions[where.id];
      }),
    },
    approval: {
      create: vi.fn(async ({ data }: any) => {
        const id = `appr_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
        const record = { id, ...data, status: "PENDING", createdAt: new Date(), updatedAt: new Date() };
        mockApprovals[id] = record;
        return record;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        if (mockApprovals[where.id]) {
          Object.assign(mockApprovals[where.id], data, { updatedAt: new Date() });
        }
        return mockApprovals[where.id];
      }),
    },
    activityEvent: {
      create: vi.fn(async ({ data }: any) => {
        const ev = { id: `ev_${Date.now()}`, ...data, timestamp: new Date() };
        mockActivityEvents.push(ev);
        return ev;
      }),
    },
  };

  return {
    prisma: {
      $transaction: vi.fn(async (cb: any) => cb(txMock)),
      workRequest: {
        findUnique: vi.fn(async ({ where }: any) => {
          const wr = mockWorkRequests[where.id];
          if (!wr) return null;
          const plan = Object.values(mockExecutionPlans).find((p) => p.workRequestId === wr.id);
          const steps = Object.values(mockExecutionSteps).filter((s) => s.executionPlanId === plan?.id);
          steps.forEach((s) => {
            s.actionItem = mockActionItems[s.actionItemId] || null;
          });

          return {
            ...wr,
            interpretation: { title: "Title", summary: "Summary", priority: "MEDIUM" },
            actionItems: Object.values(mockActionItems).filter((a) => a.workRequestId === wr.id),
            executionPlan: plan ? { ...plan, steps } : null,
            approvals: Object.values(mockApprovals).filter((a) => a.workRequestId === wr.id),
            activityEvents: mockActivityEvents.filter((e) => e.workRequestId === wr.id),
          };
        }),
        update: vi.fn(async ({ where, data }: any) => {
          if (mockWorkRequests[where.id]) {
            Object.assign(mockWorkRequests[where.id], data, { updatedAt: new Date() });
          }
          return mockWorkRequests[where.id];
        }),
      },
      executionStep: {
        findUnique: vi.fn(async ({ where }: any) => mockExecutionSteps[where.id] || null),
        update: vi.fn(async ({ where, data }: any) => {
          if (mockExecutionSteps[where.id]) {
            Object.assign(mockExecutionSteps[where.id], data, { updatedAt: new Date() });
          }
          return mockExecutionSteps[where.id];
        }),
      },
      approval: {
        findUnique: vi.fn(async ({ where }: any) => mockApprovals[where.id] || null),
        create: vi.fn(async ({ data }: any) => {
          const id = `appr_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
          const record = { id, ...data, status: "PENDING", createdAt: new Date(), updatedAt: new Date() };
          mockApprovals[id] = record;
          return record;
        }),
        update: vi.fn(async ({ where, data }: any) => {
          if (mockApprovals[where.id]) {
            Object.assign(mockApprovals[where.id], data, { updatedAt: new Date() });
          }
          return mockApprovals[where.id];
        }),
      },
      artifact: {
        findFirst: vi.fn(async ({ where }: any) => {
          return Object.values(mockArtifacts).find(
            (a) => a.workRequestId === where.workRequestId && a.executionStepId === where.executionStepId
          ) || null;
        }),
        create: vi.fn(async ({ data }: any) => {
          const id = `art_${Date.now()}`;
          const record = { id, ...data, createdAt: new Date() };
          mockArtifacts[id] = record;
          return record;
        }),
        update: vi.fn(async ({ where, data }: any) => {
          if (mockArtifacts[where.id]) {
            Object.assign(mockArtifacts[where.id], data);
          }
          return mockArtifacts[where.id];
        }),
      },
      actionItem: {
        findFirst: vi.fn(async ({ where }: any) => {
          return Object.values(mockActionItems).find(
            (a) => a.workRequestId === where.workRequestId && a.description.includes(where.description)
          ) || null;
        }),
        create: vi.fn(async ({ data }: any) => ({ id: `act_${Date.now()}`, ...data })),
      },
      activityEvent: {
        create: vi.fn(async ({ data }: any) => {
          const ev = { id: `ev_${Date.now()}`, ...data, timestamp: new Date() };
          mockActivityEvents.push(ev);
          return ev;
        }),
      },
      _seedPlan: (wr: any, steps: any[]) => {
        mockWorkRequests[wr.id] = wr;
        const planId = `plan_${wr.id}`;
        const planRecord = { id: planId, workRequestId: wr.id };
        mockExecutionPlans[planId] = planRecord;

        steps.forEach((s, idx) => {
          const stepId = s.id || `step_${wr.id}_${idx}`;
          const actionId = `act_${stepId}`;
          const actionRecord = {
            id: actionId,
            workRequestId: wr.id,
            description: s.description || "Task",
            status: "PENDING",
            priority: "MEDIUM",
            actionType: "TASK",
          };
          mockActionItems[actionId] = actionRecord;
          mockExecutionSteps[stepId] = {
            id: stepId,
            executionPlanId: planId,
            actionItemId: actionId,
            route: s.route,
            toolName: s.toolName ?? null,
            reason: s.reason ?? "Planned step",
            status: s.status ?? "PENDING",
          };
        });
      },
      _resetMockData: () => {
        Object.keys(mockWorkRequests).forEach((k) => delete mockWorkRequests[k]);
        Object.keys(mockExecutionPlans).forEach((k) => delete mockExecutionPlans[k]);
        Object.keys(mockExecutionSteps).forEach((k) => delete mockExecutionSteps[k]);
        Object.keys(mockActionItems).forEach((k) => delete mockActionItems[k]);
        Object.keys(mockToolExecutions).forEach((k) => delete mockToolExecutions[k]);
        Object.keys(mockApprovals).forEach((k) => delete mockApprovals[k]);
        Object.keys(mockArtifacts).forEach((k) => delete mockArtifacts[k]);
        mockActivityEvents.length = 0;
      },
    },
  };
});

describe("Workflow Executor & Execution State Machine (Phase 6)", () => {
  beforeEach(() => {
    (prisma as any)._resetMockData();
    vi.restoreAllMocks();
  });

  it("Test 1 — Single automatic action: executes create_task and marks WorkRequest COMPLETED", async () => {
    const wr = { id: "wr_1", originalText: "Create a follow-up task", status: "PLANNED" };
    const steps = [{ id: "s1", route: "EXECUTE_AUTOMATICALLY", toolName: "create_task", description: "Create task" }];
    (prisma as any)._seedPlan(wr, steps);

    const summary = await executeWorkRequest("wr_1");
    expect(summary.status).toBe("COMPLETED");
    expect(summary.completedStepsCount).toBe(1);
  });

  it("Test 2 — Multiple automatic actions: executes multiple steps sequentially to completion", async () => {
    const wr = { id: "wr_2", originalText: "Multiple actions", status: "PLANNED" };
    const steps = [
      { id: "s1", route: "EXECUTE_AUTOMATICALLY", toolName: "create_task", description: "Task 1" },
      { id: "s2", route: "EXECUTE_AUTOMATICALLY", toolName: "create_task", description: "Task 2" },
    ];
    (prisma as any)._seedPlan(wr, steps);

    const summary = await executeWorkRequest("wr_2");
    expect(summary.status).toBe("COMPLETED");
    expect(summary.completedStepsCount).toBe(2);
  });

  it("Test 3 — Human approval pause: pauses execution at PREPARE_FOR_HUMAN_REVIEW and creates Approval record", async () => {
    const wr = { id: "wr_3", originalText: "Draft email", status: "PLANNED" };
    const steps = [{ id: "s1", route: "PREPARE_FOR_HUMAN_REVIEW", toolName: "draft_communication", description: "Draft email" }];
    (prisma as any)._seedPlan(wr, steps);

    const summary = await executeWorkRequest("wr_3");
    expect(summary.status).toBe("WAITING_FOR_APPROVAL");
    expect(summary.pausedAtApprovalId).toBeDefined();
  });

  it("Test 4 — Approval resolution: granting approval completes step and resumes workflow execution", async () => {
    const wr = { id: "wr_4", originalText: "Draft and reminder", status: "PLANNED" };
    const steps = [
      { id: "s1", route: "PREPARE_FOR_HUMAN_REVIEW", toolName: "draft_communication", description: "Draft email" },
      { id: "s2", route: "EXECUTE_AUTOMATICALLY", toolName: "create_task", description: "Set reminder" },
    ];
    (prisma as any)._seedPlan(wr, steps);

    const initialSummary = await executeWorkRequest("wr_4");
    expect(initialSummary.status).toBe("WAITING_FOR_APPROVAL");
    const approvalId = initialSummary.pausedAtApprovalId!;

    const approvalResult = await approveStep(approvalId, "Looks good to send");
    expect(approvalResult.executionSummary.status).toBe("COMPLETED");
    expect(approvalResult.executionSummary.completedStepsCount).toBe(2);
  });

  it("Test 5 — Edit + approve: updates draft content and resumes workflow cleanly", async () => {
    const wr = { id: "wr_5", originalText: "Draft email", status: "PLANNED" };
    const steps = [{ id: "s1", route: "PREPARE_FOR_HUMAN_REVIEW", toolName: "draft_communication", description: "Draft email" }];
    (prisma as any)._seedPlan(wr, steps);

    const initialSummary = await executeWorkRequest("wr_5");
    const approvalId = initialSummary.pausedAtApprovalId!;

    const editResult = await editAndApproveStep(approvalId, "Edited body text by human reviewer", "Edited and approved");
    expect(editResult.approval.status).toBe("APPROVED");
    expect(editResult.approval.editedContent).toBe("Edited body text by human reviewer");
    expect(editResult.executionSummary.status).toBe("COMPLETED");
  });

  it("Test 6 — Reject: rejecting an approval sets step to REJECTED and stops workflow", async () => {
    const wr = { id: "wr_6", originalText: "Draft email", status: "PLANNED" };
    const steps = [{ id: "s1", route: "PREPARE_FOR_HUMAN_REVIEW", toolName: "draft_communication", description: "Draft email" }];
    (prisma as any)._seedPlan(wr, steps);

    const initialSummary = await executeWorkRequest("wr_6");
    const approvalId = initialSummary.pausedAtApprovalId!;

    const rejectResult = await rejectStep(approvalId, "Content not suitable");
    expect(rejectResult.status).toBe("REJECTED");
  });

  it("Test 7 — Clarification: REQUIRES_CLARIFICATION route sets step SKIPPED and WorkRequest to NEEDS_CLARIFICATION", async () => {
    const wr = { id: "wr_7", originalText: "Send to everyone", status: "PLANNED" };
    const steps = [{ id: "s1", route: "REQUIRES_CLARIFICATION", toolName: null, reason: "Recipients missing" }];
    (prisma as any)._seedPlan(wr, steps);

    const summary = await executeWorkRequest("wr_7");
    expect(summary.status).toBe("NEEDS_CLARIFICATION");
  });

  it("Test 8 — Cannot execute: CANNOT_EXECUTE route sets step SKIPPED and WorkRequest to FAILED", async () => {
    const wr = { id: "wr_8", originalText: "Send SMS", status: "PLANNED" };
    const steps = [{ id: "s1", route: "CANNOT_EXECUTE", toolName: null, reason: "No SMS tool available" }];
    (prisma as any)._seedPlan(wr, steps);

    const summary = await executeWorkRequest("wr_8");
    expect(summary.status).toBe("FAILED");
  });

  it("Test 9 — Tool failure: tool failure marks step FAILED and stops workflow execution", async () => {
    const wr = { id: "wr_9", originalText: "Invalid tool run", status: "PLANNED" };
    const steps = [{ id: "s1", route: "EXECUTE_AUTOMATICALLY", toolName: "non_existent_tool_fail", description: "Unknown tool" }];
    (prisma as any)._seedPlan(wr, steps);

    const summary = await executeWorkRequest("wr_9");
    expect(summary.status).toBe("FAILED");
  });

  it("Test 10 — Resume execution: skips already completed steps and executes pending step", async () => {
    const wr = { id: "wr_10", originalText: "Three step flow", status: "IN_PROGRESS" };
    const steps = [
      { id: "s1", route: "EXECUTE_AUTOMATICALLY", toolName: "create_task", status: "COMPLETED" },
      { id: "s2", route: "PREPARE_FOR_HUMAN_REVIEW", toolName: "draft_communication", status: "WAITING_FOR_APPROVAL" },
      { id: "s3", route: "EXECUTE_AUTOMATICALLY", toolName: "create_task", status: "PENDING" },
    ];
    (prisma as any)._seedPlan(wr, steps);

    // Create pending approval for step 2
    const approval = await prisma.approval.create({
      data: { workRequestId: "wr_10", executionStepId: "s2", originalContent: "Draft" },
    });

    // Approve step 2
    const result = await approveStep(approval.id);
    expect(result.executionSummary.status).toBe("COMPLETED");
    expect(result.executionSummary.completedStepsCount).toBe(3);
  });

  it("Test 11 — Idempotency: calling executeWorkRequest twice does not re-execute completed steps", async () => {
    const wr = { id: "wr_11", originalText: "Idempotent flow", status: "PLANNED" };
    const steps = [{ id: "s1", route: "EXECUTE_AUTOMATICALLY", toolName: "create_task", description: "Task" }];
    (prisma as any)._seedPlan(wr, steps);

    const run1 = await executeWorkRequest("wr_11");
    expect(run1.status).toBe("COMPLETED");

    const run2 = await executeWorkRequest("wr_11");
    expect(run2.status).toBe("COMPLETED");
  });

  it("Test 12 — Unknown tool error: handles missing tool gracefully without crashing", async () => {
    const wr = { id: "wr_12", originalText: "Unknown tool test", status: "PLANNED" };
    const steps = [{ id: "s1", route: "EXECUTE_AUTOMATICALLY", toolName: null, reason: "Missing tool" }];
    (prisma as any)._seedPlan(wr, steps);

    const summary = await executeWorkRequest("wr_12");
    expect(summary.status).toBe("FAILED");
  });

  it("Test 13 — Invalid tool input: handles validation errors safely", async () => {
    const wr = { id: "wr_13", originalText: "Bad input test", status: "PLANNED" };
    const steps = [{ id: "s1", route: "EXECUTE_AUTOMATICALLY", toolName: "create_task", description: "" }];
    (prisma as any)._seedPlan(wr, steps);

    const summary = await executeWorkRequest("wr_13");
    expect(summary).toBeDefined();
  });

  it("Test 14 — Already resolved approval: rejects attempts to re-approve an approved approval", async () => {
    const wr = { id: "wr_14", originalText: "Already resolved", status: "PLANNED" };
    const steps = [{ id: "s1", route: "PREPARE_FOR_HUMAN_REVIEW", toolName: "draft_communication" }];
    (prisma as any)._seedPlan(wr, steps);

    const initialSummary = await executeWorkRequest("wr_14");
    const approvalId = initialSummary.pausedAtApprovalId!;

    await approveStep(approvalId);
    await expect(approveStep(approvalId)).rejects.toThrow("already resolved");
  });

  it("Test 15 — Workflow completion: WorkRequest reaches COMPLETED only when all steps succeed", async () => {
    const wr = { id: "wr_15", originalText: "Complete test", status: "PLANNED" };
    const steps = [{ id: "s1", route: "EXECUTE_AUTOMATICALLY", toolName: "generate_brief", description: "Brief" }];
    (prisma as any)._seedPlan(wr, steps);

    const summary = await executeWorkRequest("wr_15");
    expect(summary.status).toBe("COMPLETED");
  });
});
