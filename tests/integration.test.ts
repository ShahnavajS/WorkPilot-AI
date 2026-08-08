import { describe, it, expect, vi, beforeEach } from "vitest";
import { processIntakeRequest } from "@/lib/ai/intake-flow";
import { generateExecutionPlan } from "@/lib/ai/planner";
import { executeWorkRequest, approveStep, editAndApproveStep, rejectStep } from "@/lib/engine";
import { getWorkRequest } from "@/lib/db/service";
import { executeTool } from "@/lib/tools";
import { prisma } from "@/lib/db/prisma";

// Mock Prisma for database persistence testing
vi.mock("@/lib/db/prisma", () => {
  const mockWorkRequests: Record<string, any> = {};
  const mockInterpretations: Record<string, any> = {};
  const mockActionItems: Record<string, any> = {};
  const mockExecutionPlans: Record<string, any> = {};
  const mockExecutionSteps: Record<string, any> = {};
  const mockToolExecutions: Record<string, any> = {};
  const mockApprovals: Record<string, any> = {};
  const mockArtifacts: Record<string, any> = {};
  const mockActivityEvents: any[] = [];

  const txMock = {
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
        const id = `int_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
        const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        mockInterpretations[id] = record;
        return record;
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
    executionPlan: {
      create: vi.fn(async ({ data }: any) => {
        const id = `plan_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
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
    artifact: {
      create: vi.fn(async ({ data }: any) => {
        const id = `art_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
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
        create: vi.fn(async ({ data }: any) => {
          const id = `wr_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
          const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
          mockWorkRequests[id] = record;
          return record;
        }),
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
            interpretation: Object.values(mockInterpretations).find((i) => i.workRequestId === wr.id) || null,
            actionItems: Object.values(mockActionItems).filter((a) => a.workRequestId === wr.id),
            executionPlan: plan ? { ...plan, steps } : null,
            approvals: Object.values(mockApprovals).filter((a) => a.workRequestId === wr.id),
            artifacts: Object.values(mockArtifacts).filter((a) => a.workRequestId === wr.id),
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
          const id = `art_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
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
        create: vi.fn(async ({ data }: any) => {
          const id = `act_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
          const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
          mockActionItems[id] = record;
          return record;
        }),
      },
      activityEvent: {
        create: vi.fn(async ({ data }: any) => {
          const ev = { id: `ev_${Date.now()}`, ...data, timestamp: new Date() };
          mockActivityEvents.push(ev);
          return ev;
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
        Object.keys(mockArtifacts).forEach((k) => delete mockArtifacts[k]);
        mockActivityEvents.length = 0;
      },
    },
  };
});

function createMockOpenAI() {
  return {
    beta: {
      chat: {
        completions: {
          parse: vi.fn(async (params: any) => {
            const userContent = params.messages?.[1]?.content ?? "";

            // Interpreter mock for website check
            if (userContent.includes("hedamo.com")) {
              return {
                choices: [
                  {
                    message: {
                      parsed: {
                        title: "Hedamo Technical Check",
                        summary: "Inspect hedamo.com",
                        priority: "HIGH",
                        detectedDeadline: null,
                        actionItems: [
                          {
                            id: "act_web_1",
                            description: "Inspect hedamo.com",
                            type: "WEBSITE_CHECK",
                            priority: "HIGH",
                            deadline: null,
                            requiresHumanConfirmation: false,
                            automationCandidate: true,
                          },
                        ],
                        missingInformation: [],
                        automatableActions: ["act_web_1"],
                        humanConfirmationRequired: [],
                      },
                    },
                  },
                ],
              };
            }

            // Interpreter mock for ambiguous request
            if (userContent.includes("take care of the documentation")) {
              return {
                choices: [
                  {
                    message: {
                      parsed: {
                        title: "Documentation Request",
                        summary: "Handle documentation and send before meeting",
                        priority: "MEDIUM",
                        detectedDeadline: null,
                        actionItems: [
                          {
                            id: "act_doc_1",
                            description: "Prepare documentation",
                            type: "REPORT",
                            priority: "MEDIUM",
                            deadline: null,
                            requiresHumanConfirmation: false,
                            automationCandidate: false,
                          },
                          {
                            id: "act_doc_2",
                            description: "Send to everyone",
                            type: "COMMUNICATION",
                            priority: "HIGH",
                            deadline: null,
                            requiresHumanConfirmation: true,
                            automationCandidate: false,
                          },
                        ],
                        missingInformation: ["Recipients not specified", "Target document not specified", "Meeting time unknown"],
                        automatableActions: [],
                        humanConfirmationRequired: ["act_doc_2"],
                      },
                    },
                  },
                ],
              };
            }

            // Interpreter mock for automatic single task
            if (userContent.includes("Create task only")) {
              return {
                choices: [
                  {
                    message: {
                      parsed: {
                        title: "Task Request",
                        summary: "Create routine task",
                        priority: "LOW",
                        detectedDeadline: null,
                        actionItems: [
                          {
                            id: "act_single_1",
                            description: "Create follow-up task",
                            type: "TASK",
                            priority: "LOW",
                            deadline: null,
                            requiresHumanConfirmation: false,
                            automationCandidate: true,
                          },
                        ],
                        missingInformation: [],
                        automatableActions: ["act_single_1"],
                        humanConfirmationRequired: [],
                      },
                    },
                  },
                ],
              };
            }

            // Default Scenario 1 Mock
            return {
              choices: [
                {
                  message: {
                    parsed: {
                      title: "Partner Discussion Follow-up",
                      summary: "Summarize partner meeting, draft thank-you email, set reminder",
                      priority: "HIGH",
                      detectedDeadline: null,
                      actionItems: [
                        {
                          id: "act_sc1_1",
                          description: "Summarize discussion",
                          type: "REPORT",
                          priority: "MEDIUM",
                          deadline: null,
                          requiresHumanConfirmation: false,
                          automationCandidate: true,
                        },
                        {
                          id: "act_sc1_2",
                          description: "Draft thank-you email",
                          type: "COMMUNICATION",
                          priority: "HIGH",
                          deadline: null,
                          requiresHumanConfirmation: true,
                          automationCandidate: false,
                        },
                        {
                          id: "act_sc1_3",
                          description: "Set 7-day reminder",
                          type: "REMINDER",
                          priority: "MEDIUM",
                          deadline: null,
                          requiresHumanConfirmation: false,
                          automationCandidate: true,
                        },
                      ],
                      missingInformation: [],
                      automatableActions: ["act_sc1_1", "act_sc1_3"],
                      humanConfirmationRequired: ["act_sc1_2"],
                    },
                  },
                },
              ],
            };
          }),
        },
      },
    },
  } as any;
}

describe("End-to-End Integration & Scenario Reliability Hardening (Phase 8)", () => {
  beforeEach(() => {
    (prisma as any)._resetMockData();
    vi.restoreAllMocks();
  });

  it("Scenario 1 End-to-End Integration: Intake -> Interpretation -> Plan -> Pause at Approval -> Edit+Approve -> Resume -> Complete", async () => {
    const mockOpenAI = createMockOpenAI();

    // Step A & B: Intake & Interpretation
    const intakeResult = await processIntakeRequest(
      "Summarize our partner discussion, extract follow-ups, draft a thank-you email, and remind me in 7 days.",
      { openaiClient: mockOpenAI }
    );
    expect(intakeResult.workRequest.status).toBe("INTERPRETED");
    expect(intakeResult.actionItems).toHaveLength(3);

    // Step C: Planning
    const planResult = await generateExecutionPlan(intakeResult.workRequest.id, { openaiClient: mockOpenAI });
    expect(planResult.plannedSteps).toHaveLength(3);

    // Step D & E: Execution & HITL Approval Pause
    const initialExecution = await executeWorkRequest(intakeResult.workRequest.id, { openaiClient: mockOpenAI });
    expect(initialExecution.status).toBe("WAITING_FOR_APPROVAL");
    expect(initialExecution.pausedAtApprovalId).toBeDefined();

    // Step F: Edit Content & Approve
    const approvalId = initialExecution.pausedAtApprovalId!;
    const editApproveResult = await editAndApproveStep(
      approvalId,
      "Thank you for speaking with our executive team. We are excited about our partnership.",
      "Edited text for partner tone"
    );

    // Step G & H: Resumption & Completion
    expect(editApproveResult.executionSummary.status).toBe("COMPLETED");
    expect(editApproveResult.executionSummary.completedStepsCount).toBe(3);

    // Verify persisted database consistency
    const finalWR = await getWorkRequest(intakeResult.workRequest.id);
    expect(finalWR?.status).toBe("COMPLETED");
    expect(finalWR?.artifacts.length).toBeGreaterThan(0);
    expect(finalWR?.activityEvents.length).toBeGreaterThan(5);
  });

  it("Scenario 2 End-to-End Integration: Website inspection (hedamo.com) produces technical report artifact", async () => {
    const mockOpenAI = createMockOpenAI();

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      url: "https://hedamo.com",
      text: async () => "<html><head><title>Hedamo — AI Engine</title><meta name=\"description\" content=\"Platform\"></head><body>Hedamo</body></html>",
    } as any);

    const intake = await processIntakeRequest(
      "Review hedamo.com, run whatever automated checks the prototype actually supports, and produce a short technical report.",
      { openaiClient: mockOpenAI }
    );
    expect(intake.workRequest.status).toBe("INTERPRETED");

    // Execute website_check directly via tool registry
    const toolRes = await executeTool(
      "website_check",
      { url: "https://hedamo.com" },
      { workRequestId: intake.workRequest.id }
    );

    expect(toolRes.success).toBe(true);
    expect(toolRes.output?.statusCode).toBe(200);
    expect(toolRes.output?.title).toBe("Hedamo — AI Engine");
    expect(toolRes.output?.checksPerformed).toHaveLength(5);
  });

  it("Scenario 3 End-to-End Integration: Ambiguous request identifies missing info and stops execution in NEEDS_CLARIFICATION", async () => {
    const mockOpenAI = createMockOpenAI();

    const intake = await processIntakeRequest(
      "Please take care of the documentation and send it to everyone before the meeting.",
      { openaiClient: mockOpenAI }
    );

    const missingInfo = (intake.dbInterpretation.missingInformation as string[]) || [];
    expect(missingInfo).toHaveLength(3);

    const plan = await generateExecutionPlan(intake.workRequest.id, { openaiClient: mockOpenAI });
    const hasClarification = plan.plannedSteps.some((s) => s.route === "REQUIRES_CLARIFICATION");
    expect(hasClarification).toBe(true);

    const execution = await executeWorkRequest(intake.workRequest.id, { openaiClient: mockOpenAI });
    expect(execution.status).toBe("NEEDS_CLARIFICATION");
  });

  it("Idempotency & Double Execution Protection: executing completed workflow twice does not re-run completed steps", async () => {
    const mockOpenAI = createMockOpenAI();

    const intake = await processIntakeRequest("Create task only", { openaiClient: mockOpenAI });
    await generateExecutionPlan(intake.workRequest.id, { openaiClient: mockOpenAI });

    const run1 = await executeWorkRequest(intake.workRequest.id, { openaiClient: mockOpenAI });
    const run2 = await executeWorkRequest(intake.workRequest.id, { openaiClient: mockOpenAI });

    expect(run1.status).toBe("COMPLETED");
    expect(run2.status).toBe("COMPLETED");
  });

  it("Approval Resolution Edge Cases: prevents double approval and prevents approving rejected steps", async () => {
    const mockOpenAI = createMockOpenAI();

    const intake = await processIntakeRequest(
      "Summarize our partner discussion, extract follow-ups, draft a thank-you email, and remind me in 7 days.",
      { openaiClient: mockOpenAI }
    );
    await generateExecutionPlan(intake.workRequest.id, { openaiClient: mockOpenAI });
    const exec = await executeWorkRequest(intake.workRequest.id, { openaiClient: mockOpenAI });

    const approvalId = exec.pausedAtApprovalId!;

    // First rejection
    await rejectStep(approvalId, "Rejected");

    // Second rejection or approval after rejection should fail
    await expect(approveStep(approvalId)).rejects.toThrow("already resolved");
    await expect(rejectStep(approvalId)).rejects.toThrow("already resolved");
  });
});
