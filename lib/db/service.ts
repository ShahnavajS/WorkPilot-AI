import {
  prisma,
} from "@/lib/db/prisma";
import type {
  WorkRequest,
  WorkRequestStatus,
  Interpretation,
  PriorityLevel,
  ActionItem,
  ActionItemStatus,
  ExecutionPlan,
  ExecutionStep,
  ExecutionRoute,
  ExecutionStepStatus,
  ToolExecution,
  ToolExecutionStatus,
  Approval,
  ApprovalStatus,
  Artifact,
  ArtifactType,
  ActivityEvent,
  ActivityEventType,
  Prisma,
} from "@prisma/client";

// Re-export Prisma types for convenience across the app
export type {
  WorkRequest,
  WorkRequestStatus,
  Interpretation,
  PriorityLevel,
  ActionItem,
  ActionItemStatus,
  ExecutionPlan,
  ExecutionStep,
  ExecutionRoute,
  ExecutionStepStatus,
  ToolExecution,
  ToolExecutionStatus,
  Approval,
  ApprovalStatus,
  Artifact,
  ArtifactType,
  ActivityEvent,
  ActivityEventType,
};

// -----------------------------------------------------------------------------
// INPUT TYPES
// -----------------------------------------------------------------------------

export interface CreateInterpretationInput {
  workRequestId: string;
  title: string;
  summary: string;
  priority?: PriorityLevel;
  detectedDeadline?: Date | null;
  missingInformation?: Record<string, unknown> | Array<unknown> | null;
  automatableActions?: Record<string, unknown> | Array<unknown> | null;
  humanConfirmationReqs?: Record<string, unknown> | Array<unknown> | null;
}

export interface CreateActionItemInput {
  description: string;
  priority?: PriorityLevel | null;
  dueAt?: Date | null;
  actionType?: string | null;
  status?: ActionItemStatus;
}

export interface CreateExecutionStepInput {
  actionItemId?: string | null;
  route: ExecutionRoute;
  reason: string;
  toolName?: string | null;
  status?: ExecutionStepStatus;
}

export interface CreateToolExecutionInput {
  workRequestId: string;
  executionStepId?: string | null;
  toolName: string;
  input?: Record<string, unknown> | null;
}

export interface UpdateToolExecutionInput {
  status: ToolExecutionStatus;
  output?: Record<string, unknown> | null;
  error?: string | null;
  completedAt?: Date;
}

export interface CreateApprovalInput {
  workRequestId: string;
  executionStepId: string;
  originalContent?: string | null;
}

export interface CreateArtifactInput {
  workRequestId: string;
  executionStepId?: string | null;
  type: ArtifactType;
  title: string;
  content: string;
  metadata?: Record<string, unknown> | null;
}

// -----------------------------------------------------------------------------
// WORK REQUEST SERVICE PRIMITIVES
// -----------------------------------------------------------------------------

/**
 * Creates a new WorkRequest in RECEIVED status and logs an initial ActivityEvent.
 */
export async function createWorkRequest(originalText: string): Promise<WorkRequest> {
  return prisma.$transaction(async (tx) => {
    const workRequest = await tx.workRequest.create({
      data: {
        originalText,
        status: "RECEIVED",
      },
    });

    await tx.activityEvent.create({
      data: {
        workRequestId: workRequest.id,
        type: "REQUEST_RECEIVED",
        message: `Work request received: "${originalText.slice(0, 80)}${originalText.length > 80 ? "..." : ""}"`,
      },
    });

    return workRequest;
  });
}

/**
 * Retrieves a WorkRequest with all nested relationships.
 */
export async function getWorkRequest(id: string) {
  return prisma.workRequest.findUnique({
    where: { id },
    include: {
      interpretation: true,
      actionItems: {
        orderBy: { createdAt: "asc" },
      },
      executionPlan: {
        include: {
          steps: {
            include: {
              actionItem: true,
              toolExecutions: true,
              approvals: true,
              artifacts: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      toolExecutions: {
        orderBy: { createdAt: "asc" },
      },
      approvals: {
        orderBy: { createdAt: "asc" },
      },
      artifacts: {
        orderBy: { createdAt: "asc" },
      },
      activityEvents: {
        orderBy: { timestamp: "asc" },
      },
    },
  });
}

/**
 * Lists recent WorkRequests with basic status information.
 */
export async function listWorkRequests(limit = 20): Promise<WorkRequest[]> {
  return prisma.workRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Updates the overall status of a WorkRequest.
 */
export async function updateWorkRequestStatus(
  id: string,
  status: WorkRequestStatus
): Promise<WorkRequest> {
  return prisma.workRequest.update({
    where: { id },
    data: { status },
  });
}

// -----------------------------------------------------------------------------
// INTERPRETATION & ACTION ITEMS
// -----------------------------------------------------------------------------

/**
 * Saves AI Interpretation for a WorkRequest and updates request status to INTERPRETED.
 */
export async function createInterpretation(
  input: CreateInterpretationInput
): Promise<Interpretation> {
  return prisma.$transaction(async (tx) => {
    const interpretation = await tx.interpretation.create({
      data: {
        workRequestId: input.workRequestId,
        title: input.title,
        summary: input.summary,
        priority: input.priority ?? "MEDIUM",
        detectedDeadline: input.detectedDeadline,
        missingInformation: input.missingInformation ? (input.missingInformation as Prisma.InputJsonValue) : undefined,
        automatableActions: input.automatableActions ? (input.automatableActions as Prisma.InputJsonValue) : undefined,
        humanConfirmationReqs: input.humanConfirmationReqs ? (input.humanConfirmationReqs as Prisma.InputJsonValue) : undefined,
      },
    });

    await tx.workRequest.update({
      where: { id: input.workRequestId },
      data: { status: "INTERPRETED" },
    });

    await tx.activityEvent.create({
      data: {
        workRequestId: input.workRequestId,
        type: "INTERPRETATION_COMPLETED",
        message: `Interpretation generated: "${input.title}" (${input.priority ?? "MEDIUM"} priority)`,
      },
    });

    return interpretation;
  });
}

/**
 * Adds concrete ActionItems to a WorkRequest.
 */
export async function createActionItems(
  workRequestId: string,
  items: CreateActionItemInput[]
): Promise<ActionItem[]> {
  const createdItems: ActionItem[] = [];

  for (const item of items) {
    const created = await prisma.actionItem.create({
      data: {
        workRequestId,
        description: item.description,
        priority: item.priority,
        dueAt: item.dueAt,
        actionType: item.actionType,
        status: item.status ?? "PENDING",
      },
    });
    createdItems.push(created);
  }

  return createdItems;
}

// -----------------------------------------------------------------------------
// EXECUTION PLAN & STEPS
// -----------------------------------------------------------------------------

/**
 * Transactionally creates an ExecutionPlan with its individual ExecutionSteps.
 */
export async function createExecutionPlan(
  workRequestId: string,
  steps: CreateExecutionStepInput[]
): Promise<ExecutionPlan & { steps: ExecutionStep[] }> {
  return prisma.$transaction(async (tx) => {
    const plan = await tx.executionPlan.create({
      data: {
        workRequestId,
        steps: {
          create: steps.map((step) => ({
            actionItemId: step.actionItemId,
            route: step.route,
            reason: step.reason,
            toolName: step.toolName,
            status: step.status ?? "PENDING",
          })),
        },
      },
      include: {
        steps: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    await tx.workRequest.update({
      where: { id: workRequestId },
      data: { status: "PLANNED" },
    });

    await tx.activityEvent.create({
      data: {
        workRequestId,
        type: "PLAN_CREATED",
        message: `Execution plan generated with ${steps.length} action steps.`,
      },
    });

    return plan;
  });
}

/**
 * Updates an ExecutionStep status.
 */
export async function updateExecutionStepStatus(
  stepId: string,
  status: ExecutionStepStatus
): Promise<ExecutionStep> {
  return prisma.executionStep.update({
    where: { id: stepId },
    data: { status },
  });
}

// -----------------------------------------------------------------------------
// TOOL EXECUTIONS
// -----------------------------------------------------------------------------

/**
 * Records the initiation of a ToolExecution (status = RUNNING).
 */
export async function startToolExecution(
  input: CreateToolExecutionInput
): Promise<ToolExecution> {
  return prisma.$transaction(async (tx) => {
    const toolExecution = await tx.toolExecution.create({
      data: {
        workRequestId: input.workRequestId,
        executionStepId: input.executionStepId,
        toolName: input.toolName,
        status: "RUNNING",
        input: input.input ? (input.input as Prisma.InputJsonValue) : undefined,
        startedAt: new Date(),
      },
    });

    await tx.activityEvent.create({
      data: {
        workRequestId: input.workRequestId,
        type: "TOOL_STARTED",
        message: `Tool "${input.toolName}" execution started.`,
        metadata: { toolExecutionId: toolExecution.id },
      },
    });

    return toolExecution;
  });
}

/**
 * Updates a ToolExecution record with output or failure details.
 */
export async function completeToolExecution(
  id: string,
  update: UpdateToolExecutionInput
): Promise<ToolExecution> {
  return prisma.$transaction(async (tx) => {
    const toolExecution = await tx.toolExecution.update({
      where: { id },
      data: {
        status: update.status,
        output: update.output ? (update.output as Prisma.InputJsonValue) : undefined,
        error: update.error,
        completedAt: update.completedAt ?? new Date(),
      },
    });

    const isSuccess = update.status === "SUCCEEDED";
    await tx.activityEvent.create({
      data: {
        workRequestId: toolExecution.workRequestId,
        type: isSuccess ? "TOOL_SUCCEEDED" : "TOOL_FAILED",
        message: isSuccess
          ? `Tool "${toolExecution.toolName}" completed successfully.`
          : `Tool "${toolExecution.toolName}" failed: ${update.error ?? "Unknown error"}`,
        metadata: { toolExecutionId: id, error: update.error },
      },
    });

    return toolExecution;
  });
}

// -----------------------------------------------------------------------------
// APPROVALS
// -----------------------------------------------------------------------------

/**
 * Creates a PENDING Approval record for a step requiring human review.
 */
export async function createApproval(input: CreateApprovalInput): Promise<Approval> {
  return prisma.$transaction(async (tx) => {
    const approval = await tx.approval.create({
      data: {
        workRequestId: input.workRequestId,
        executionStepId: input.executionStepId,
        status: "PENDING",
        originalContent: input.originalContent,
      },
    });

    await tx.executionStep.update({
      where: { id: input.executionStepId },
      data: { status: "WAITING_FOR_APPROVAL" },
    });

    await tx.workRequest.update({
      where: { id: input.workRequestId },
      data: { status: "WAITING_FOR_APPROVAL" },
    });

    await tx.activityEvent.create({
      data: {
        workRequestId: input.workRequestId,
        type: "APPROVAL_REQUESTED",
        message: "Human approval requested for execution step.",
        metadata: { approvalId: approval.id, executionStepId: input.executionStepId },
      },
    });

    return approval;
  });
}

/**
 * Resolves a human approval decision (APPROVED or REJECTED) with optional edited content.
 */
export async function resolveApproval(
  approvalId: string,
  status: ApprovalStatus,
  editedContent?: string,
  reviewerNote?: string
): Promise<Approval> {
  return prisma.$transaction(async (tx) => {
    const approval = await tx.approval.update({
      where: { id: approvalId },
      data: {
        status,
        editedContent,
        reviewerNote,
        resolvedAt: new Date(),
      },
    });

    const isApproved = status === "APPROVED";
    await tx.executionStep.update({
      where: { id: approval.executionStepId },
      data: { status: isApproved ? "COMPLETED" : "REJECTED" },
    });

    await tx.activityEvent.create({
      data: {
        workRequestId: approval.workRequestId,
        type: isApproved ? "APPROVAL_APPROVED" : "APPROVAL_REJECTED",
        message: isApproved
          ? "Human review APPROVED the action item."
          : `Human review REJECTED the action item${reviewerNote ? `: ${reviewerNote}` : "."}`,
        metadata: { approvalId, status, editedContent },
      },
    });

    return approval;
  });
}

// -----------------------------------------------------------------------------
// ARTIFACTS & ACTIVITY EVENTS
// -----------------------------------------------------------------------------

/**
 * Saves a tool or execution output Artifact.
 */
export async function createArtifact(input: CreateArtifactInput): Promise<Artifact> {
  return prisma.artifact.create({
    data: {
      workRequestId: input.workRequestId,
      executionStepId: input.executionStepId,
      type: input.type,
      title: input.title,
      content: input.content,
      metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : undefined,
    },
  });
}

/**
 * Logs a human-readable ActivityEvent to the audit trace.
 */
export async function createActivityEvent(
  workRequestId: string,
  type: ActivityEventType,
  message: string,
  metadata?: Record<string, unknown>
): Promise<ActivityEvent> {
  return prisma.activityEvent.create({
    data: {
      workRequestId,
      type,
      message,
      metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
    },
  });
}

/**
 * Retrieves the activity trace timeline for a WorkRequest.
 */
export async function getActivityEvents(workRequestId: string): Promise<ActivityEvent[]> {
  return prisma.activityEvent.findMany({
    where: { workRequestId },
    orderBy: { timestamp: "asc" },
  });
}
