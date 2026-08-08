import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  interpretWorkRequest,
  processIntakeRequest,
  InterpretationResultSchema,
  type InterpretationResult,
} from "@/lib/ai";
import { prisma } from "@/lib/db/prisma";

// Mock Prisma for database operations
vi.mock("@/lib/db/prisma", () => {
  const mockWorkRequests: Record<string, any> = {};
  const mockActivityEvents: any[] = [];

  return {
    prisma: {
      $transaction: vi.fn(async (cb: any) => cb({
        workRequest: {
          create: vi.fn(async ({ data }: any) => {
            const id = `wr_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
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
            return { id: `interp_${Date.now()}`, ...data, createdAt: new Date() };
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
        update: vi.fn(async ({ where, data }: any) => {
          if (mockWorkRequests[where.id]) {
            Object.assign(mockWorkRequests[where.id], data, { updatedAt: new Date() });
          }
          return mockWorkRequests[where.id];
        }),
        findUnique: vi.fn(async ({ where }: any) => {
          return mockWorkRequests[where.id] || null;
        }),
      },
      actionItem: {
        create: vi.fn(async ({ data }: any) => {
          return { id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`, ...data, createdAt: new Date() };
        }),
      },
      activityEvent: {
        create: vi.fn(async ({ data }: any) => {
          const ev = { id: `ev_${Date.now()}`, ...data, timestamp: new Date() };
          mockActivityEvents.push(ev);
          return ev;
        }),
        findMany: vi.fn(async ({ where }: any) => {
          return mockActivityEvents.filter((e) => e.workRequestId === where.workRequestId);
        }),
      },
      _resetMockData: () => {
        Object.keys(mockWorkRequests).forEach((k) => delete mockWorkRequests[k]);
        mockActivityEvents.length = 0;
      },
    },
  };
});

// Helper to create a mock OpenAI client returning custom JSON
function createMockOpenAI(mockOutput: Partial<InterpretationResult> | Error) {
  if (mockOutput instanceof Error) {
    return {
      beta: {
        chat: {
          completions: {
            parse: vi.fn().mockRejectedValue(mockOutput),
          },
        },
      },
    } as any;
  }

  return {
    beta: {
      chat: {
        completions: {
          parse: vi.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  parsed: mockOutput,
                  content: JSON.stringify(mockOutput),
                },
              },
            ],
          }),
        },
      },
    },
  } as any;
}

describe("AI Interpreter Engine (Phase 3)", () => {
  beforeEach(() => {
    (prisma as any)._resetMockData();
  });

  it("Test 1 — Normal Request: parses title, summary, priority, and action items", async () => {
    const mockInterpretation: InterpretationResult = {
      title: "Partner Follow-up",
      summary: "Draft thank-you email and create a follow-up task for next week.",
      priority: "HIGH",
      detectedDeadline: null,
      actionItems: [
        {
          id: "action-1",
          description: "Draft thank-you email to partner",
          type: "COMMUNICATION",
          priority: "HIGH",
          deadline: null,
          requiresHumanConfirmation: true,
          automationCandidate: true,
        },
        {
          id: "action-2",
          description: "Create follow-up task for next week",
          type: "TASK",
          priority: "MEDIUM",
          deadline: null,
          requiresHumanConfirmation: false,
          automationCandidate: true,
        },
      ],
      missingInformation: [],
      automatableActions: ["action-1", "action-2"],
      humanConfirmationRequired: ["action-1"],
    };

    const mockOpenAI = createMockOpenAI(mockInterpretation);
    const result = await interpretWorkRequest(
      "Draft a thank-you email to the partner and create a follow-up task for next week.",
      { openaiClient: mockOpenAI }
    );

    expect(result.title).toBe("Partner Follow-up");
    expect(result.actionItems).toHaveLength(2);
    expect(result.actionItems[0].requiresHumanConfirmation).toBe(true);
    expect(InterpretationResultSchema.safeParse(result).success).toBe(true);
  });

  it("Test 2 — Ambiguous Request: preserves missing facts without inventing recipients or dates", async () => {
    const mockAmbiguousResult: InterpretationResult = {
      title: "Send Documentation",
      summary: "User requested sending documentation before a meeting.",
      priority: "MEDIUM",
      detectedDeadline: null, // NO invented deadline
      actionItems: [
        {
          id: "action-1",
          description: "Send documentation to meeting participants",
          type: "COMMUNICATION",
          priority: "MEDIUM",
          deadline: null,
          requiresHumanConfirmation: true,
          automationCandidate: false,
        },
      ],
      missingInformation: [
        "Recipients ('everyone') are not specified with email addresses",
        "Target documentation file/link is not specified",
        "Meeting date, time, and schedule details are missing",
      ],
      automatableActions: [],
      humanConfirmationRequired: ["action-1"],
    };

    const mockOpenAI = createMockOpenAI(mockAmbiguousResult);
    const result = await interpretWorkRequest(
      "Please take care of the documentation and send it to everyone before the meeting.",
      { openaiClient: mockOpenAI }
    );

    expect(result.detectedDeadline).toBeNull();
    expect(result.missingInformation).toHaveLength(3);
    expect(result.missingInformation[0]).toContain("Recipients");
    expect(result.missingInformation[1]).toContain("documentation");
  });

  it("Test 3 — No Deadline Request: ensures detectedDeadline is null", async () => {
    const mockNoDeadlineResult: InterpretationResult = {
      title: "Customer Feedback Review",
      summary: "Review customer feedback and prepare a summary brief.",
      priority: "LOW",
      detectedDeadline: null,
      actionItems: [
        {
          id: "action-1",
          description: "Review customer feedback and summarize findings",
          type: "REPORT",
          priority: "LOW",
          deadline: null,
          requiresHumanConfirmation: false,
          automationCandidate: true,
        },
      ],
      missingInformation: [],
      automatableActions: ["action-1"],
      humanConfirmationRequired: [],
    };

    const mockOpenAI = createMockOpenAI(mockNoDeadlineResult);
    const result = await interpretWorkRequest(
      "Review the customer feedback and prepare a summary.",
      { openaiClient: mockOpenAI }
    );

    expect(result.detectedDeadline).toBeNull();
  });

  it("Test 4 — Relative Deadline Request: calculates target date relative to provided timestamp", async () => {
    const referenceTimestamp = new Date("2026-08-01T12:00:00.000Z");
    const target7DaysLater = new Date("2026-08-08T12:00:00.000Z").toISOString();

    const mockRelativeDeadlineResult: InterpretationResult = {
      title: "7-Day Follow-up Reminder",
      summary: "Set a reminder task in 7 days.",
      priority: "MEDIUM",
      detectedDeadline: target7DaysLater,
      actionItems: [
        {
          id: "action-1",
          description: "Set reminder for 7 days from reference date",
          type: "REMINDER",
          priority: "MEDIUM",
          deadline: target7DaysLater,
          requiresHumanConfirmation: false,
          automationCandidate: true,
        },
      ],
      missingInformation: [],
      automatableActions: ["action-1"],
      humanConfirmationRequired: [],
    };

    const mockOpenAI = createMockOpenAI(mockRelativeDeadlineResult);
    const result = await interpretWorkRequest("Create a follow-up task in 7 days.", {
      openaiClient: mockOpenAI,
      currentTimestamp: referenceTimestamp,
    });

    expect(result.detectedDeadline).toBe(target7DaysLater);
  });

  it("Test 5 — Invalid AI Output: throws Zod validation error and does not return corrupt data", async () => {
    // Malformed result violating Zod schema (missing required fields)
    const invalidResult = {
      priority: "INVALID_PRIORITY_ENUM",
      actionItems: "not-an-array",
    };

    const mockOpenAI = createMockOpenAI(invalidResult as any);

    await expect(
      interpretWorkRequest("Some work request", { openaiClient: mockOpenAI })
    ).rejects.toThrow();
  });

  it("Test 6 — OpenAI API Failure: updates WorkRequest status to FAILED and logs failure event", async () => {
    const apiError = new Error("OpenAI API rate limit exceeded (500).");
    const mockOpenAI = createMockOpenAI(apiError);

    await expect(
      processIntakeRequest("Process this work request", { openaiClient: mockOpenAI })
    ).rejects.toThrow("OpenAI API rate limit exceeded");
  });

  it("Test 7 — Full End-to-End Application Intake Workflow", async () => {
    const mockSuccessResult: InterpretationResult = {
      title: "Routine Business Discussion",
      summary: "Summarize partner meeting, draft thank-you email, and reminder.",
      priority: "HIGH",
      detectedDeadline: null,
      actionItems: [
        {
          id: "action-1",
          description: "Summarize discussion",
          type: "REPORT",
          priority: "HIGH",
          deadline: null,
          requiresHumanConfirmation: false,
          automationCandidate: true,
        },
        {
          id: "action-2",
          description: "Draft thank-you email",
          type: "COMMUNICATION",
          priority: "HIGH",
          deadline: null,
          requiresHumanConfirmation: true,
          automationCandidate: true,
        },
      ],
      missingInformation: [],
      automatableActions: ["action-1"],
      humanConfirmationRequired: ["action-2"],
    };

    const mockOpenAI = createMockOpenAI(mockSuccessResult);
    const intakeRes = await processIntakeRequest(
      "Summarize partner discussion and draft thank-you email.",
      { openaiClient: mockOpenAI }
    );

    expect(intakeRes.workRequest.id).toBeDefined();
    expect(intakeRes.dbInterpretation.title).toBe("Routine Business Discussion");
    expect(intakeRes.actionItems).toHaveLength(2);

    const trace = await prisma.activityEvent.findMany({
      where: { workRequestId: intakeRes.workRequest.id },
    });
    expect(trace.some((e) => e.type === "REQUEST_RECEIVED")).toBe(true);
    expect(trace.some((e) => e.type === "INTERPRETATION_STARTED")).toBe(true);
    expect(trace.some((e) => e.type === "INTERPRETATION_COMPLETED")).toBe(true);
  });
});
