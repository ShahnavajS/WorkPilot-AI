import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateExecutionPlan, validateAndEnforcePlanSafety } from "@/lib/ai/planner";
import { prisma } from "@/lib/db/prisma";

// Mock Prisma for database operations
vi.mock("@/lib/db/prisma", () => {
  const mockWorkRequests: Record<string, any> = {};
  const mockInterpretations: Record<string, any> = {};
  const mockActionItems: Record<string, any> = {};
  const mockExecutionPlans: Record<string, any> = {};
  const mockExecutionSteps: Record<string, any> = {};
  const mockActivityEvents: any[] = [];

  return {
    prisma: {
      $transaction: vi.fn(async (cb: any) => cb({
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
        workRequest: {
          update: vi.fn(async ({ where, data }: any) => {
            if (mockWorkRequests[where.id]) {
              Object.assign(mockWorkRequests[where.id], data, { updatedAt: new Date() });
            }
            return mockWorkRequests[where.id];
          }),
        },
        activityEvent: {
          create: vi.fn(async ({ data }: any) => {
            const ev = { id: `ev_${Date.now()}`, ...data, timestamp: new Date() };
            mockActivityEvents.push(ev);
            return ev;
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
      activityEvent: {
        create: vi.fn(async ({ data }: any) => {
          const ev = { id: `ev_${Date.now()}`, ...data, timestamp: new Date() };
          mockActivityEvents.push(ev);
          return ev;
        }),
      },
      _seedData: (wr: any, interp: any, actions: any[], plan?: any) => {
        mockWorkRequests[wr.id] = wr;
        if (interp) mockInterpretations[interp.id] = interp;
        actions.forEach((a) => (mockActionItems[a.id] = a));
        if (plan) mockExecutionPlans[plan.id] = plan;
      },
      _resetMockData: () => {
        Object.keys(mockWorkRequests).forEach((k) => delete mockWorkRequests[k]);
        Object.keys(mockInterpretations).forEach((k) => delete mockInterpretations[k]);
        Object.keys(mockActionItems).forEach((k) => delete mockActionItems[k]);
        Object.keys(mockExecutionPlans).forEach((k) => delete mockExecutionPlans[k]);
        Object.keys(mockExecutionSteps).forEach((k) => delete mockExecutionSteps[k]);
        mockActivityEvents.length = 0;
      },
    },
  };
});

describe("Agentic Planner & Action Routing (Phase 4)", () => {
  beforeEach(() => {
    (prisma as any)._resetMockData();
  });

  it("Test 1 — Safe Task Creation: routes routine task creation to EXECUTE_AUTOMATICALLY with create_task tool", async () => {
    const wr = { id: "wr_1", originalText: "Create a follow-up task for next week.", status: "INTERPRETED" };
    const interp = { id: "int_1", workRequestId: "wr_1", title: "Task Request", summary: "Create task", missingInformation: [] };
    const action = { id: "act_1", workRequestId: "wr_1", description: "Create a follow-up task for next week", actionType: "TASK", status: "PENDING" };
    (prisma as any)._seedData(wr, interp, [action]);

    const result = await generateExecutionPlan("wr_1");
    expect(result.plannedSteps).toHaveLength(1);
    expect(result.plannedSteps[0].route).toBe("EXECUTE_AUTOMATICALLY");
    expect(result.plannedSteps[0].toolName).toBe("create_task");
  });

  it("Test 2 — Communication Draft: routes thank-you email draft to PREPARE_FOR_HUMAN_REVIEW with draft_communication tool", async () => {
    const wr = { id: "wr_2", originalText: "Draft a thank-you email to the partner.", status: "INTERPRETED" };
    const interp = { id: "int_2", workRequestId: "wr_2", title: "Thank You Email", summary: "Draft email", missingInformation: [] };
    const action = { id: "act_2", workRequestId: "wr_2", description: "Draft a thank-you email to partner", actionType: "COMMUNICATION", status: "PENDING" };
    (prisma as any)._seedData(wr, interp, [action]);

    const result = await generateExecutionPlan("wr_2");
    expect(result.plannedSteps[0].route).toBe("PREPARE_FOR_HUMAN_REVIEW");
    expect(result.plannedSteps[0].toolName).toBe("draft_communication");
    expect(result.plannedSteps[0].requiresApproval).toBe(true);
  });

  it("Test 3 — Missing Recipients: routes email request with missing recipients to REQUIRES_CLARIFICATION without inventing send_email", async () => {
    const wr = { id: "wr_3", originalText: "Send the report to everyone.", status: "INTERPRETED" };
    const interp = { id: "int_3", workRequestId: "wr_3", title: "Send Report", summary: "Send report", missingInformation: ["Recipients email addresses not specified"] };
    const action = { id: "act_3", workRequestId: "wr_3", description: "Send report to everyone", actionType: "COMMUNICATION", status: "PENDING" };
    (prisma as any)._seedData(wr, interp, [action]);

    const result = await generateExecutionPlan("wr_3");
    expect(result.plannedSteps[0].route).toBe("REQUIRES_CLARIFICATION");
    expect(result.plannedSteps[0].toolName).toBeNull();
    expect(result.plannedSteps[0].clarificationRequired).toBe(true);
  });

  it("Test 4 — Unsupported Action: routes SMS send request to CANNOT_EXECUTE", async () => {
    const wr = { id: "wr_4", originalText: "Send an SMS to the customer.", status: "INTERPRETED" };
    const interp = { id: "int_4", workRequestId: "wr_4", title: "SMS Request", summary: "Send SMS", missingInformation: [] };
    const action = { id: "act_4", workRequestId: "wr_4", description: "Send an SMS to the customer", actionType: "SMS_DISPATCH", status: "PENDING" };
    (prisma as any)._seedData(wr, interp, [action]);

    const result = await generateExecutionPlan("wr_4");
    expect(result.plannedSteps[0].route).toBe("CANNOT_EXECUTE");
    expect(result.plannedSteps[0].toolName).toBeNull();
  });

  it("Test 5 — Website Check: routes website inspection to EXECUTE_AUTOMATICALLY with website_check tool", async () => {
    const wr = { id: "wr_5", originalText: "Review hedamo.com.", status: "INTERPRETED" };
    const interp = { id: "int_5", workRequestId: "wr_5", title: "Hedamo Check", summary: "Check hedamo.com", missingInformation: [] };
    const action = { id: "act_5", workRequestId: "wr_5", description: "Run technical automated check on hedamo.com", actionType: "WEBSITE_CHECK", status: "PENDING" };
    (prisma as any)._seedData(wr, interp, [action]);

    const result = await generateExecutionPlan("wr_5");
    expect(result.plannedSteps[0].route).toBe("EXECUTE_AUTOMATICALLY");
    expect(result.plannedSteps[0].toolName).toBe("website_check");
  });

  it("Test 6 — Missing Website: routes website review without URL to REQUIRES_CLARIFICATION", async () => {
    const wr = { id: "wr_6", originalText: "Review the website.", status: "INTERPRETED" };
    const interp = { id: "int_6", workRequestId: "wr_6", title: "Website Review", summary: "Review website", missingInformation: ["Target website URL is not specified"] };
    const action = { id: "act_6", workRequestId: "wr_6", description: "Review the website", actionType: "WEBSITE_CHECK", status: "PENDING" };
    (prisma as any)._seedData(wr, interp, [action]);

    const result = await generateExecutionPlan("wr_6");
    expect(result.plannedSteps[0].route).toBe("REQUIRES_CLARIFICATION");
  });

  it("Test 7 — Human Confirmation Cannot Be Bypassed: forces PREPARE_FOR_HUMAN_REVIEW when human approval is required", () => {
    const candidateStep = {
      actionItemId: "act_7",
      route: "EXECUTE_AUTOMATICALLY" as const,
      toolName: "draft_communication",
      reason: "Attempting auto execution",
      requiresApproval: false,
      clarificationRequired: false,
    };
    const action = { id: "act_7", workRequestId: "wr_7", description: "Draft email", actionType: "COMMUNICATION", priority: null, dueAt: null, status: "WAITING_FOR_APPROVAL" as const, createdAt: new Date(), updatedAt: new Date() };

    const validated = validateAndEnforcePlanSafety([candidateStep], { actionItems: [action] });
    expect(validated[0].route).toBe("PREPARE_FOR_HUMAN_REVIEW");
    expect(validated[0].requiresApproval).toBe(true);
  });

  it("Test 8 — Unknown Tool Rerouting: safely converts unknown tool candidate to CANNOT_EXECUTE", () => {
    const candidateStep = {
      actionItemId: "act_8",
      route: "EXECUTE_AUTOMATICALLY" as const,
      toolName: "send_email", // Unknown tool
      reason: "Attempting send_email",
      requiresApproval: false,
      clarificationRequired: false,
    };
    const action = { id: "act_8", workRequestId: "wr_8", description: "Send email", actionType: "COMMUNICATION", priority: null, dueAt: null, status: "PENDING" as const, createdAt: new Date(), updatedAt: new Date() };

    const validated = validateAndEnforcePlanSafety([candidateStep], { actionItems: [action] });
    expect(validated[0].route).toBe("CANNOT_EXECUTE");
    expect(validated[0].toolName).toBeNull();
  });

  it("Test 9 — Every Action Item Represented: 4 action items produce 4 execution steps", async () => {
    const wr = { id: "wr_9", originalText: "Complex request", status: "INTERPRETED" };
    const interp = { id: "int_9", workRequestId: "wr_9", title: "Complex Request", summary: "Summary", missingInformation: [] };
    const actions = [
      { id: "act_9_1", workRequestId: "wr_9", description: "Summarize discussion", actionType: "REPORT", status: "PENDING" },
      { id: "act_9_2", workRequestId: "wr_9", description: "Create task", actionType: "TASK", status: "PENDING" },
      { id: "act_9_3", workRequestId: "wr_9", description: "Draft email", actionType: "COMMUNICATION", status: "PENDING" },
      { id: "act_9_4", workRequestId: "wr_9", description: "Set reminder", actionType: "REMINDER", status: "PENDING" },
    ];
    (prisma as any)._seedData(wr, interp, actions);

    const result = await generateExecutionPlan("wr_9");
    expect(result.plannedSteps).toHaveLength(4);
    expect(result.executionPlan.steps).toHaveLength(4);
  });

  it("Test 10 — Idempotency Protection: returning existing plan when planning request twice", async () => {
    const wr = { id: "wr_10", originalText: "Idempotent request", status: "INTERPRETED" };
    const interp = { id: "int_10", workRequestId: "wr_10", title: "Title", summary: "Summary", missingInformation: [] };
    const action = { id: "act_10", workRequestId: "wr_10", description: "Task", actionType: "TASK", status: "PENDING" };
    (prisma as any)._seedData(wr, interp, [action]);

    const firstRun = await generateExecutionPlan("wr_10");
    expect(firstRun.executionPlan.id).toBeDefined();

    // Second run should return existing plan without recreating
    const secondRun = await generateExecutionPlan("wr_10");
    expect(secondRun.executionPlan.id).toBe(firstRun.executionPlan.id);
  });
});
