import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import {
  getWorkRequest,
  createExecutionPlan as dbCreateExecutionPlan,
  updateWorkRequestStatus,
  createActivityEvent,
  type ExecutionPlan,
  type ExecutionStep,
  type ExecutionStepStatus,
} from "@/lib/db/service";
import { PlannerOutputSchema, type PlannedStep } from "./schemas";
import { PLANNER_SYSTEM_PROMPT, buildPlannerUserPrompt } from "./prompts";
import { validateAndEnforcePlanSafety } from "./validator";
import { findCapabilityForActionType } from "./capabilities";

export interface PlanOptions {
  openaiClient?: OpenAI;
}

export interface PlanResult {
  executionPlan: ExecutionPlan & { steps: ExecutionStep[] };
  plannedSteps: PlannedStep[];
}

/**
 * Agentic Planner Function.
 * Takes a validated WorkRequest + Interpretation + ActionItems, generates a safe ExecutionPlan,
 * enforces safety boundaries, and persists the ExecutionPlan and ExecutionSteps.
 *
 * CRITICAL RULE: PLANNING ONLY. DOES NOT EXECUTE TOOLS.
 */
export async function generateExecutionPlan(
  workRequestId: string,
  options: PlanOptions = {}
): Promise<PlanResult> {
  const workRequest = await getWorkRequest(workRequestId);
  if (!workRequest) {
    throw new Error(`WorkRequest '${workRequestId}' not found.`);
  }

  // Idempotency Protection: Prevent duplicate plan generation
  if (workRequest.executionPlan) {
    return {
      executionPlan: workRequest.executionPlan as ExecutionPlan & { steps: ExecutionStep[] },
      plannedSteps: workRequest.executionPlan.steps.map((s) => ({
        actionItemId: s.actionItemId ?? "",
        route: s.route,
        toolName: s.toolName,
        reason: s.reason,
        requiresApproval: s.status === "WAITING_FOR_APPROVAL",
        clarificationRequired: s.route === "REQUIRES_CLARIFICATION",
      })),
    };
  }

  if (!workRequest.interpretation) {
    throw new Error(`WorkRequest '${workRequestId}' has no valid interpretation. Cannot plan.`);
  }

  if (!workRequest.actionItems || workRequest.actionItems.length === 0) {
    throw new Error(`WorkRequest '${workRequestId}' has no action items. Cannot plan.`);
  }

  // Log activity event
  await createActivityEvent(
    workRequestId,
    "PLAN_STARTED",
    "Agentic planner started generating execution plan."
  );

  let candidateSteps: PlannedStep[] = [];

  try {
    const openai =
      options.openaiClient ??
      new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || "dummy-key-for-test",
      });

    const completion = await openai.beta.chat.completions.parse({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: PLANNER_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildPlannerUserPrompt(
            workRequest.interpretation,
            workRequest.actionItems
          ),
        },
      ],
      response_format: zodResponseFormat(PlannerOutputSchema, "planner_output"),
      temperature: 0.1,
    });

    const parsed = completion.choices[0]?.message?.parsed;
    if (parsed && Array.isArray(parsed.plannedSteps)) {
      candidateSteps = parsed.plannedSteps;
    }
  } catch {
    // Deterministic heuristic fallback if LLM is unavailable / mocked test
    candidateSteps = workRequest.actionItems.map((action) => {
      const cap = findCapabilityForActionType(action.actionType);
      return {
        actionItemId: action.id,
        route: cap
          ? cap.requiresHumanApproval
            ? "PREPARE_FOR_HUMAN_REVIEW"
            : "EXECUTE_AUTOMATICALLY"
          : "CANNOT_EXECUTE",
        toolName: cap ? cap.name : null,
        reason: cap
          ? `Routed based on tool capability '${cap.name}'.`
          : `No capability available for action type '${action.actionType ?? "unknown"}'.`,
        requiresApproval: cap ? cap.requiresHumanApproval : false,
        clarificationRequired: false,
      };
    });
  }

  // Enforce Deterministic Safety Rules
  const validatedSteps = validateAndEnforcePlanSafety(candidateSteps, {
    actionItems: workRequest.actionItems,
    interpretation: workRequest.interpretation,
  });

  // Prepare database inputs with explicit step statuses
  const stepsInput = validatedSteps.map((step) => {
    let initialStatus: ExecutionStepStatus = "PENDING";
    if (step.route === "REQUIRES_CLARIFICATION" || step.route === "CANNOT_EXECUTE") {
      initialStatus = "SKIPPED";
    }

    return {
      actionItemId: step.actionItemId,
      route: step.route,
      reason: step.reason,
      toolName: step.toolName,
      status: initialStatus,
    };
  });

  // Persist ExecutionPlan and ExecutionSteps
  const executionPlan = await dbCreateExecutionPlan(workRequestId, stepsInput);

  // Determine overall WorkRequest status
  const hasClarification = validatedSteps.some((s) => s.route === "REQUIRES_CLARIFICATION");
  const newStatus = hasClarification ? "NEEDS_CLARIFICATION" : "PLANNED";
  await updateWorkRequestStatus(workRequestId, newStatus);

  // Log per-action routing events
  for (const step of validatedSteps) {
    const actionDesc =
      workRequest.actionItems.find((a) => a.id === step.actionItemId)?.description ?? "Action";
    await createActivityEvent(
      workRequestId,
      step.route === "REQUIRES_CLARIFICATION" ? "CLARIFICATION_REQUIRED" : "PLAN_CREATED",
      `Action '${actionDesc.slice(0, 50)}' routed to ${step.route} (Tool: ${step.toolName ?? "none"}). Reason: ${step.reason}`
    );
  }

  return {
    executionPlan,
    plannedSteps: validatedSteps,
  };
}
