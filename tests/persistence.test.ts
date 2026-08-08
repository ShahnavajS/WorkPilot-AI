import { describe, it, expect, beforeEach, vi } from "vitest";
import * as service from "@/lib/db/service";
import { prisma } from "@/lib/db/prisma";

// Mock Prisma client methods for deterministic testing
vi.mock("@/lib/db/prisma", () => {
  const mockWorkRequests: Record<string, any> = {};
  const mockInterpretations: Record<string, any> = {};
  const mockActionItems: Record<string, any> = {};
  const mockExecutionPlans: Record<string, any> = {};
  const mockExecutionSteps: Record<string, any> = {};
  const mockToolExecutions: Record<string, any> = {};
  const mockApprovals: Record<string, any> = {};
  const mockActivityEvents: any[] = [];

  return {
    prisma: {
      $transaction: vi.fn(async (cb: any) => cb({
        workRequest: {
          create: vi.fn(async ({ data }: any) => {
            const id = `wr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
            mockWorkRequests[id] = record;
            return record;
          }),
          update: vi.fn(async ({ where, data }: any) => {
            if (mockWorkRequests[where.id]) {
              Object.assign(mockWorkRequests[where.id], data, { updatedAt: new Date() });
            }
            return mockWorkRequests[where.id];
          }),
        },
        interpretation: {
          create: vi.fn(async ({ data }: any) => {
            const id = `interp_${Date.now()}`;
            const record = { id, ...data, createdAt: new Date() };
            mockInterpretations[id] = record;
            return record;
          }),
        },
        executionPlan: {
          create: vi.fn(async ({ data }: any) => {
            const id = `plan_${Date.now()}`;
            const stepsData = data.steps?.create || [];
            const steps = stepsData.map((s: any, idx: number) => {
              const stepId = `step_${id}_${idx}`;
              const stepRecord = { id: stepId, executionPlanId: id, ...s, createdAt: new Date(), updatedAt: new Date() };
              mockExecutionSteps[stepId] = stepRecord;
              return stepRecord;
            });
            const record = { id, workRequestId: data.workRequestId, steps, createdAt: new Date(), updatedAt: new Date() };
            mockExecutionPlans[id] = record;
            return record;
          }),
        },
        executionStep: {
          update: vi.fn(async ({ where, data }: any) => {
            if (mockExecutionSteps[where.id]) {
              Object.assign(mockExecutionSteps[where.id], data, { updatedAt: new Date() });
            }
            return mockExecutionSteps[where.id];
          }),
        },
        toolExecution: {
          create: vi.fn(async ({ data }: any) => {
            const id = `te_${Date.now()}`;
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
            const id = `appr_${Date.now()}`;
            const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
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
            const id = `ev_${Date.now()}`;
            const record = { id, ...data, timestamp: new Date() };
            mockActivityEvents.push(record);
            return record;
          }),
        },
      })),
      workRequest: {
        findUnique: vi.fn(async ({ where }: any) => {
          const wr = mockWorkRequests[where.id];
          if (!wr) return null;
          return {
            ...wr,
            interpretation: Object.values(mockInterpretations).find((i) => i.workRequestId === wr.id) || null,
            actionItems: Object.values(mockActionItems).filter((a) => a.workRequestId === wr.id),
            executionPlan: Object.values(mockExecutionPlans).find((p) => p.workRequestId === wr.id) || null,
            toolExecutions: Object.values(mockToolExecutions).filter((t) => t.workRequestId === wr.id),
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
      actionItem: {
        create: vi.fn(async ({ data }: any) => {
          const id = `act_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
          const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
          mockActionItems[id] = record;
          return record;
        }),
      },
      executionStep: {
        update: vi.fn(async ({ where, data }: any) => {
          if (mockExecutionSteps[where.id]) {
            Object.assign(mockExecutionSteps[where.id], data, { updatedAt: new Date() });
          }
          return mockExecutionSteps[where.id];
        }),
      },
      artifact: {
        create: vi.fn(async ({ data }: any) => {
          return { id: `art_${Date.now()}`, ...data, createdAt: new Date() };
        }),
      },
      activityEvent: {
        create: vi.fn(async ({ data }: any) => {
          const record = { id: `ev_${Date.now()}`, ...data, timestamp: new Date() };
          mockActivityEvents.push(record);
          return record;
        }),
        findMany: vi.fn(async ({ where }: any) => {
          return mockActivityEvents.filter((e) => e.workRequestId === where.workRequestId);
        }),
      },
      _resetMockData: () => {
        Object.keys(mockWorkRequests).forEach((k) => delete mockWorkRequests[k]);
        Object.keys(mockInterpretations).forEach((k) => delete mockInterpretations[k]);
        Object.keys(mockActionItems).forEach((k) => delete mockActionItems[k]);
        Object.keys(mockExecutionPlans).forEach((k) => delete mockExecutionPlans[k]);
        Object.keys(mockExecutionSteps).forEach((k) => delete mockExecutionSteps[k]);
        Object.keys(mockToolExecutions).forEach((k) => delete mockToolExecutions[k]);
        Object.keys(mockApprovals).forEach((k) => delete mockApprovals[k]);
        mockActivityEvents.length = 0;
      },
    },
  };
});

describe("Persistence Layer & Service Primitives", () => {
  beforeEach(() => {
    (prisma as any)._resetMockData();
  });

  it("Test 1: WorkRequest can be created and retrieved with correct status", async () => {
    const wr = await service.createWorkRequest("Summarize meeting notes and email client.");
    expect(wr.id).toBeDefined();
    expect(wr.status).toBe("RECEIVED");
    expect(wr.originalText).toBe("Summarize meeting notes and email client.");

    const retrieved = await service.getWorkRequest(wr.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(wr.id);
  });

  it("Test 2: WorkRequest can have multiple ActionItems associated", async () => {
    const wr = await service.createWorkRequest("Draft email and remind me in 7 days.");
    const items = await service.createActionItems(wr.id, [
      { description: "Draft email", actionType: "COMMUNICATION" },
      { description: "7-day reminder", actionType: "REMINDER", dueAt: new Date(Date.now() + 7 * 86400000) },
    ]);

    expect(items).toHaveLength(2);
    expect(items[0].workRequestId).toBe(wr.id);
    expect(items[1].actionType).toBe("REMINDER");

    const retrieved = await service.getWorkRequest(wr.id);
    expect(retrieved?.actionItems).toHaveLength(2);
  });

  it("Test 3: ExecutionPlan can contain ExecutionSteps mapped to routes and tools", async () => {
    const wr = await service.createWorkRequest("Test plan request");
    const plan = await service.createExecutionPlan(wr.id, [
      {
        route: "EXECUTE_AUTOMATICALLY",
        reason: "Auto brief generator",
        toolName: "generate_brief",
      },
      {
        route: "PREPARE_FOR_HUMAN_REVIEW",
        reason: "Draft email requires review",
        toolName: "draft_communication",
      },
    ]);

    expect(plan.workRequestId).toBe(wr.id);
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[0].route).toBe("EXECUTE_AUTOMATICALLY");
    expect(plan.steps[1].route).toBe("PREPARE_FOR_HUMAN_REVIEW");
  });

  it("Test 4: ToolExecution records both success and failure distinctly", async () => {
    const wr = await service.createWorkRequest("Website check request");

    // Success path
    const toolRun1 = await service.startToolExecution({
      workRequestId: wr.id,
      toolName: "website_check",
      input: { url: "https://hedamo.com" },
    });
    expect(toolRun1.status).toBe("RUNNING");

    const finishedSuccess = await service.completeToolExecution(toolRun1.id, {
      status: "SUCCEEDED",
      output: { httpStatus: 200, title: "Hedamo" },
    });
    expect(finishedSuccess.status).toBe("SUCCEEDED");
    expect(finishedSuccess.output).toEqual({ httpStatus: 200, title: "Hedamo" });

    // Failure path
    const toolRun2 = await service.startToolExecution({
      workRequestId: wr.id,
      toolName: "website_check",
      input: { url: "https://invalid-timeout.test" },
    });
    const finishedFailed = await service.completeToolExecution(toolRun2.id, {
      status: "FAILED",
      error: "Connection timed out after 10 seconds.",
    });
    expect(finishedFailed.status).toBe("FAILED");
    expect(finishedFailed.error).toBe("Connection timed out after 10 seconds.");
  });

  it("Test 5: Approval can transition from PENDING to APPROVED or REJECTED with edits", async () => {
    const wr = await service.createWorkRequest("Approval test");
    const plan = await service.createExecutionPlan(wr.id, [
      { route: "PREPARE_FOR_HUMAN_REVIEW", reason: "Email draft", toolName: "draft_communication" },
    ]);
    const step = plan.steps[0];

    const approval = await service.createApproval({
      workRequestId: wr.id,
      executionStepId: step.id,
      originalContent: "Original Subject: Hello",
    });
    expect(approval.status).toBe("PENDING");

    const resolved = await service.resolveApproval(
      approval.id,
      "APPROVED",
      "Edited Subject: Hello (Updated)"
    );
    expect(resolved.status).toBe("APPROVED");
    expect(resolved.editedContent).toBe("Edited Subject: Hello (Updated)");
  });

  it("Test 6: ActivityEvents are chronologically logged and linked to WorkRequest", async () => {
    const wr = await service.createWorkRequest("Activity log test");
    await service.createActivityEvent(wr.id, "INTERPRETATION_STARTED", "Parsing request");
    await service.createActivityEvent(wr.id, "INTERPRETATION_COMPLETED", "3 action items extracted");

    const trace = await service.getActivityEvents(wr.id);
    expect(trace.length).toBeGreaterThanOrEqual(3); // REQUEST_RECEIVED + 2 custom
    expect(trace[0].type).toBe("REQUEST_RECEIVED");
    expect(trace[1].type).toBe("INTERPRETATION_STARTED");
  });

  it("Test 7: Important relationships link correctly without orphaned steps or orphaned events", async () => {
    const wr = await service.createWorkRequest("Relationship integrity test");
    await service.createInterpretation({
      workRequestId: wr.id,
      title: "Integrity Test",
      summary: "Testing relationships",
    });
    await service.createActionItems(wr.id, [{ description: "Action 1" }]);
    const plan = await service.createExecutionPlan(wr.id, [
      { route: "EXECUTE_AUTOMATICALLY", reason: "Test step" },
    ]);
    expect(plan.id).toBeDefined();

    const retrieved = await service.getWorkRequest(wr.id);
    expect(retrieved?.interpretation?.title).toBe("Integrity Test");
    expect(retrieved?.actionItems[0].description).toBe("Action 1");
    expect(retrieved?.executionPlan?.steps[0].reason).toBe("Test step");
  });
});
