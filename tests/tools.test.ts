import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getTool,
  listRegisteredTools,
  executeTool,
  createTaskTool,
} from "@/lib/tools";
import { prisma } from "@/lib/db/prisma";

// Mock Prisma for database persistence testing
vi.mock("@/lib/db/prisma", () => {
  const mockWorkRequests: Record<string, any> = {};
  const mockActionItems: Record<string, any> = {};
  const mockExecutionSteps: Record<string, any> = {};
  const mockToolExecutions: Record<string, any> = {};
  const mockArtifacts: Record<string, any> = {};
  const mockActivityEvents: any[] = [];

  return {
    prisma: {
      $transaction: vi.fn(async (cb: any) => cb({
        workRequest: {
          create: vi.fn(async ({ data }: any) => {
            const id = `wr_${Date.now()}`;
            const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
            mockWorkRequests[id] = record;
            return record;
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
        activityEvent: {
          create: vi.fn(async ({ data }: any) => {
            const ev = { id: `ev_${Date.now()}`, ...data, timestamp: new Date() };
            mockActivityEvents.push(ev);
            return ev;
          }),
        },
      })),
      workRequest: {
        findUnique: vi.fn(async ({ where }: any) => mockWorkRequests[where.id] || null),
      },
      actionItem: {
        findFirst: vi.fn(async ({ where }: any) => {
          return Object.values(mockActionItems).find((a) => a.workRequestId === where.workRequestId && a.description.includes(where.description)) || null;
        }),
        create: vi.fn(async ({ data }: any) => {
          const id = `act_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
          const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
          mockActionItems[id] = record;
          return record;
        }),
      },
      executionStep: {
        findUnique: vi.fn(async ({ where }: any) => {
          const s = mockExecutionSteps[where.id];
          if (!s) return null;
          return {
            ...s,
            actionItem: s.actionItemId ? mockActionItems[s.actionItemId] : null,
          };
        }),
        update: vi.fn(async ({ where, data }: any) => {
          if (mockExecutionSteps[where.id]) {
            Object.assign(mockExecutionSteps[where.id], data, { updatedAt: new Date() });
          }
          return mockExecutionSteps[where.id];
        }),
      },
      artifact: {
        create: vi.fn(async ({ data }: any) => {
          const id = `art_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
          const record = { id, ...data, createdAt: new Date() };
          mockArtifacts[id] = record;
          return record;
        }),
      },
      activityEvent: {
        create: vi.fn(async ({ data }: any) => {
          const ev = { id: `ev_${Date.now()}`, ...data, timestamp: new Date() };
          mockActivityEvents.push(ev);
          return ev;
        }),
        findMany: vi.fn(async ({ where }: any) => mockActivityEvents.filter((e) => e.workRequestId === where.workRequestId)),
      },
      _seedStep: (step: any, action?: any) => {
        mockExecutionSteps[step.id] = step;
        if (action) mockActionItems[action.id] = action;
      },
      _resetMockData: () => {
        Object.keys(mockWorkRequests).forEach((k) => delete mockWorkRequests[k]);
        Object.keys(mockActionItems).forEach((k) => delete mockActionItems[k]);
        Object.keys(mockExecutionSteps).forEach((k) => delete mockExecutionSteps[k]);
        Object.keys(mockToolExecutions).forEach((k) => delete mockToolExecutions[k]);
        Object.keys(mockArtifacts).forEach((k) => delete mockArtifacts[k]);
        mockActivityEvents.length = 0;
      },
    },
  };
});

describe("Tool Registry & Real Tool System (Phase 5)", () => {
  beforeEach(() => {
    (prisma as any)._resetMockData();
    vi.restoreAllMocks();
  });

  describe("Tool Registry & Execution Engine", () => {
    it("returns registered tool definitions for known tool names", () => {
      expect(getTool("create_task")).toBeDefined();
      expect(getTool("draft_communication")).toBeDefined();
      expect(getTool("generate_brief")).toBeDefined();
      expect(getTool("website_check")).toBeDefined();
      expect(listRegisteredTools()).toHaveLength(4);
    });

    it("returns controlled error when trying to look up or execute an unknown tool (e.g. send_email)", async () => {
      expect(getTool("send_email")).toBeNull();

      const result = await executeTool("send_email", {}, { workRequestId: "wr_1" });
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("TOOL_NOT_FOUND");
    });

    it("rejects invalid tool inputs before execution and records failure", async () => {
      const result = await executeTool("create_task", { invalidField: 123 }, { workRequestId: "wr_1" });
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_INPUT");
    });
  });

  describe("Tool 1 — create_task", () => {
    it("creates a persistent task record in the database", async () => {
      const result = await executeTool(
        "create_task",
        { title: "Set 7-day follow-up reminder", priority: "HIGH", actionType: "REMINDER" },
        { workRequestId: "wr_1" }
      );

      expect(result.success).toBe(true);
      expect(result.output?.taskId).toBeDefined();
      expect(result.output?.title).toContain("Set 7-day follow-up reminder");
      expect(result.output?.createdNew).toBe(true);
    });

    it("enforces idempotency by returning existing task instead of creating duplicate", async () => {
      const context = { workRequestId: "wr_idempotent", executionStepId: "step_1" };
      const step = { id: "step_1", executionPlanId: "plan_1", actionItemId: "act_existing" };
      const action = { id: "act_existing", workRequestId: "wr_idempotent", description: "Set reminder", status: "PENDING" };
      (prisma as any)._seedStep(step, action);

      const result = await createTaskTool.execute({ title: "Set reminder", actionType: "REMINDER", priority: "MEDIUM" }, context);
      expect(result.taskId).toBe("act_existing");
      expect(result.createdNew).toBe(false);
    });
  });

  describe("Tool 2 — draft_communication", () => {
    it("prepares a draft communication artifact and flags DRAFT_ONLY status without sending real email", async () => {
      const result = await executeTool(
        "draft_communication",
        { topic: "Partner Discussion", context: "Summary of discussion points" },
        { workRequestId: "wr_2" }
      );

      expect(result.success).toBe(true);
      expect(result.output?.status).toBe("DRAFT_ONLY");
      expect(result.output?.recipient).toContain("Unknown / Missing in request");
      expect(result.output?.subject).toContain("Partner Discussion");
    });
  });

  describe("Tool 3 — generate_brief", () => {
    it("generates a structured Markdown brief and persists an Artifact", async () => {
      const result = await executeTool(
        "generate_brief",
        {
          title: "Partner Discussion Brief",
          requestSummary: "Executive overview of partner meeting",
          actionItemSummaries: ["Draft thank-you email", "Set 7-day reminder"],
          priority: "HIGH",
        },
        { workRequestId: "wr_3" }
      );

      expect(result.success).toBe(true);
      expect(result.output?.format).toBe("markdown");
      expect(result.output?.markdownContent).toContain("# Executive Work Brief: Partner Discussion Brief");
      expect(result.output?.markdownContent).toContain("Draft thank-you email");
    });
  });

  describe("Tool 4 — website_check", () => {
    it("performs real HTTP availability inspection on a valid public URL", async () => {
      // Mock global fetch for unit testing
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        status: 200,
        url: "https://hedamo.com",
        text: async () => "<html><head><title>Hedamo — Modern AI Solutions</title><meta name=\"description\" content=\"AI platform\"></head><body>Hedamo</body></html>",
      } as any);

      const result = await executeTool(
        "website_check",
        { url: "https://hedamo.com" },
        { workRequestId: "wr_4" }
      );

      expect(result.success).toBe(true);
      expect(result.output?.statusCode).toBe(200);
      expect(result.output?.title).toBe("Hedamo — Modern AI Solutions");
      expect(result.output?.metaDescription).toBe("AI platform");
      expect(result.output?.checksPerformed).toHaveLength(5);
    });

    it("rejects SSRF / private local IP addresses safely", async () => {
      const result = await executeTool(
        "website_check",
        { url: "http://127.0.0.1:8080/admin" },
        { workRequestId: "wr_5" }
      );

      expect(result.success).toBe(true); // Tool execution completed, but output reports check failure
      expect(result.output?.success).toBe(false);
      expect(result.output?.issues[0]).toContain("SSRF protection");
    });

    it("handles connection timeouts gracefully and returns explicit timeout error", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        const err = new Error("Connection timed out after 10 seconds.");
        err.name = "AbortError";
        throw err;
      });

      const result = await executeTool(
        "website_check",
        { url: "https://slow-response-timeout.test" },
        { workRequestId: "wr_6" }
      );

      expect(result.success).toBe(true);
      expect(result.output?.success).toBe(false);
      expect(result.output?.issues[0]).toContain("Connection timed out");
    });
  });
});
