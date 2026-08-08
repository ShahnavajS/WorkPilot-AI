import OpenAI from "openai";
import {
  getWorkRequest,
  createApproval,
  createActivityEvent,
  type ExecutionPlan,
  type ExecutionStep,
} from "@/lib/db/service";
import { executeTool } from "@/lib/tools";
import { transitionWorkRequest, transitionExecutionStep } from "./state-machine";

export interface ExecutionOptions {
  openaiClient?: OpenAI;
  currentTimestamp?: Date;
}

export interface ExecutionSummary {
  workRequestId: string;
  status: string;
  completedStepsCount: number;
  totalStepsCount: number;
  pausedAtApprovalId?: string | null;
  failedStepId?: string | null;
}

/**
 * Constructs tool input parameters dynamically from ExecutionStep and ActionItem context.
 */
function buildToolInput(step: any, workRequest: any): Record<string, unknown> {
  const actionItem = step.actionItem;
  const description = actionItem?.description ?? "Execute planned step";
  const toolName = step.toolName;

  if (toolName === "website_check") {
    // Extract URL from description or original text
    const urlMatch =
      description.match(/https?:\/\/[^\s]+/i) ||
      workRequest.originalText.match(/https?:\/\/[^\s]+/i) ||
      description.match(/([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/i) ||
      workRequest.originalText.match(/([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/i);

    const rawUrl = urlMatch ? urlMatch[0] : "https://hedamo.com";
    return { url: rawUrl };
  }

  if (toolName === "draft_communication") {
    const topic = workRequest.interpretation?.title ?? description;
    const contextText = workRequest.interpretation?.summary ?? workRequest.originalText;
    return {
      topic,
      context: contextText,
      recipientName: null,
      recipientRole: null,
      tone: "professional",
    };
  }

  if (toolName === "generate_brief") {
    const title = workRequest.interpretation?.title ?? "Work Summary";
    const requestSummary = workRequest.interpretation?.summary ?? workRequest.originalText;
    const actionItemSummaries = (workRequest.actionItems || []).map((a: any) => a.description);
    return {
      title,
      requestSummary,
      actionItemSummaries,
      priority: workRequest.interpretation?.priority ?? "MEDIUM",
    };
  }

  // Default input for create_task
  return {
    title: description,
    priority: actionItem?.priority ?? "MEDIUM",
    actionType: actionItem?.actionType ?? "TASK",
    dueAt: actionItem?.dueAt ? actionItem.dueAt.toISOString() : null,
  };
}

/**
 * Executes or resumes a persisted ExecutionPlan for a WorkRequest.
 * Enforces sequential step processing, state persistence, idempotency, and approval pausing.
 */
export async function executeWorkRequest(
  workRequestId: string,
  options: ExecutionOptions = {}
): Promise<ExecutionSummary> {
  const workRequest = await getWorkRequest(workRequestId);
  if (!workRequest) {
    throw new Error(`WorkRequest '${workRequestId}' not found.`);
  }

  const executionPlan = workRequest.executionPlan as ExecutionPlan & { steps: ExecutionStep[] };
  if (!executionPlan || !executionPlan.steps || executionPlan.steps.length === 0) {
    throw new Error(`WorkRequest '${workRequestId}' has no execution plan to execute.`);
  }

  const steps = executionPlan.steps;
  const totalStepsCount = steps.length;

  // Transition to IN_PROGRESS if started from PLANNED or resumed from WAITING_FOR_APPROVAL
  if (workRequest.status === "PLANNED" || workRequest.status === "WAITING_FOR_APPROVAL") {
    await transitionWorkRequest(workRequestId, workRequest.status, "IN_PROGRESS");
    await createActivityEvent(workRequestId, "EXECUTION_STARTED", "Workflow execution active.");
  }

  for (const step of steps as any[]) {
    // IDEMPOTENCY CHECK: Skip steps that are already in a terminal/completed state
    if (step.status === "COMPLETED" || step.status === "SKIPPED" || step.status === "REJECTED") {
      continue;
    }

    // Check if step is already paused waiting for approval
    if (step.status === "WAITING_FOR_APPROVAL") {
      const pendingApproval = (workRequest.approvals || []).find(
        (a: any) => a.executionStepId === step.id && a.status === "PENDING"
      );

      await transitionWorkRequest(workRequestId, workRequest.status, "WAITING_FOR_APPROVAL");
      return {
        workRequestId,
        status: "WAITING_FOR_APPROVAL",
        completedStepsCount: steps.filter((s) => s.status === "COMPLETED" || s.status === "SKIPPED").length,
        totalStepsCount,
        pausedAtApprovalId: pendingApproval?.id ?? null,
      };
    }

    // ROUTE 3: REQUIRES_CLARIFICATION
    if (step.route === "REQUIRES_CLARIFICATION") {
      await transitionExecutionStep(step.id, step.status, "SKIPPED");
      await transitionWorkRequest(workRequestId, workRequest.status, "NEEDS_CLARIFICATION");
      await createActivityEvent(
        workRequestId,
        "CLARIFICATION_REQUIRED",
        `Execution paused: ${step.reason}`
      );

      return {
        workRequestId,
        status: "NEEDS_CLARIFICATION",
        completedStepsCount: steps.filter((s) => s.status === "COMPLETED" || s.status === "SKIPPED").length,
        totalStepsCount,
      };
    }

    // ROUTE 4: CANNOT_EXECUTE
    if (step.route === "CANNOT_EXECUTE") {
      await transitionExecutionStep(step.id, step.status, "SKIPPED");
      await transitionWorkRequest(workRequestId, workRequest.status, "FAILED");
      await createActivityEvent(
        workRequestId,
        "ACTION_FAILED",
        `Execution stopped: Cannot execute step. ${step.reason}`
      );

      return {
        workRequestId,
        status: "FAILED",
        completedStepsCount: steps.filter((s) => s.status === "COMPLETED" || s.status === "SKIPPED").length,
        totalStepsCount,
        failedStepId: step.id,
      };
    }

    // ROUTE 2: PREPARE_FOR_HUMAN_REVIEW
    if (step.route === "PREPARE_FOR_HUMAN_REVIEW") {
      await transitionExecutionStep(step.id, step.status, "RUNNING");
      await createActivityEvent(
        workRequestId,
        "ACTION_STARTED",
        `Started action: ${step.actionItem?.description ?? "Human Review Preparation"}`
      );

      let draftContent = "Draft artifact awaiting review.";

      // Run tool to prepare draft if registered
      if (step.toolName) {
        const input = buildToolInput(step, workRequest);
        const toolResult = await executeTool(step.toolName, input, {
          workRequestId,
          executionStepId: step.id,
          openaiClient: options.openaiClient,
        });

        if (toolResult.success && toolResult.output && toolResult.output.body) {
          draftContent = toolResult.output.body;
        }
      }

      // Create persistent Approval record
      const approval = await createApproval({
        workRequestId,
        executionStepId: step.id,
        originalContent: draftContent,
      });

      await transitionExecutionStep(step.id, "RUNNING", "WAITING_FOR_APPROVAL");
      await transitionWorkRequest(workRequestId, workRequest.status, "WAITING_FOR_APPROVAL");
      await createActivityEvent(
        workRequestId,
        "APPROVAL_REQUESTED",
        `Waiting for human approval for: ${step.actionItem?.description ?? "Human Review Action"}`
      );
      await createActivityEvent(
        workRequestId,
        "EXECUTION_PAUSED",
        "Workflow execution paused awaiting human approval."
      );

      return {
        workRequestId,
        status: "WAITING_FOR_APPROVAL",
        completedStepsCount: steps.filter((s) => s.status === "COMPLETED" || s.status === "SKIPPED").length,
        totalStepsCount,
        pausedAtApprovalId: approval.id,
      };
    }

    // ROUTE 1: EXECUTE_AUTOMATICALLY
    if (step.route === "EXECUTE_AUTOMATICALLY") {
      if (!step.toolName) {
        // Unknown tool boundary check
        await transitionExecutionStep(step.id, step.status, "FAILED");
        await transitionWorkRequest(workRequestId, workRequest.status, "FAILED");
        await createActivityEvent(
          workRequestId,
          "ACTION_FAILED",
          `Execution step '${step.id}' has route EXECUTE_AUTOMATICALLY but no tool is specified.`
        );

        return {
          workRequestId,
          status: "FAILED",
          completedStepsCount: steps.filter((s) => s.status === "COMPLETED" || s.status === "SKIPPED").length,
          totalStepsCount,
          failedStepId: step.id,
        };
      }

      await transitionExecutionStep(step.id, step.status, "RUNNING");
      await createActivityEvent(
        workRequestId,
        "ACTION_STARTED",
        `Started action: ${step.actionItem?.description ?? step.toolName}`
      );

      const input = buildToolInput(step, workRequest);
      const toolResult = await executeTool(step.toolName, input, {
        workRequestId,
        executionStepId: step.id,
        openaiClient: options.openaiClient,
      });

      if (toolResult.success) {
        await transitionExecutionStep(step.id, "RUNNING", "COMPLETED");
        await createActivityEvent(
          workRequestId,
          "ACTION_COMPLETED",
          `Completed action: ${step.actionItem?.description ?? step.toolName}`
        );
      } else {
        // Tool Execution Failed! Stop workflow safely
        await transitionExecutionStep(step.id, "RUNNING", "FAILED");
        await transitionWorkRequest(workRequestId, workRequest.status, "FAILED");
        await createActivityEvent(
          workRequestId,
          "ACTION_FAILED",
          `Action '${step.actionItem?.description ?? step.toolName}' failed: ${toolResult.error?.message}`
        );
        await createActivityEvent(
          workRequestId,
          "EXECUTION_FAILED",
          `Workflow execution stopped because action '${step.id}' failed.`
        );

        return {
          workRequestId,
          status: "FAILED",
          completedStepsCount: steps.filter((s) => s.status === "COMPLETED" || s.status === "SKIPPED").length,
          totalStepsCount,
          failedStepId: step.id,
        };
      }
    }
  }

  // Refresh current steps state
  const updatedWorkRequest = await getWorkRequest(workRequestId);
  const updatedSteps = updatedWorkRequest?.executionPlan?.steps || [];
  const completedCount = updatedSteps.filter(
    (s: any) => s.status === "COMPLETED" || s.status === "SKIPPED"
  ).length;

  // Mark WorkRequest COMPLETED if all steps finished successfully and request is in active progress
  if (
    updatedWorkRequest?.status === "IN_PROGRESS" &&
    completedCount === totalStepsCount
  ) {
    await transitionWorkRequest(
      workRequestId,
      "IN_PROGRESS",
      "COMPLETED"
    );
    await createActivityEvent(
      workRequestId,
      "EXECUTION_COMPLETED",
      "All planned workflow actions completed successfully."
    );
    return {
      workRequestId,
      status: "COMPLETED",
      completedStepsCount: totalStepsCount,
      totalStepsCount,
    };
  }

  return {
    workRequestId,
    status: updatedWorkRequest?.status ?? "IN_PROGRESS",
    completedStepsCount: completedCount,
    totalStepsCount,
  };
}

/**
 * Resumes execution of a paused WorkRequest.
 */
export async function resumeWorkRequest(
  workRequestId: string,
  options: ExecutionOptions = {}
): Promise<ExecutionSummary> {
  const wr = await getWorkRequest(workRequestId);
  if (wr?.status === "WAITING_FOR_APPROVAL" || wr?.status === "IN_PROGRESS" || wr?.status === "PLANNED") {
    await createActivityEvent(workRequestId, "EXECUTION_RESUMED", "Workflow execution resumed.");
  }
  return executeWorkRequest(workRequestId, options);
}
