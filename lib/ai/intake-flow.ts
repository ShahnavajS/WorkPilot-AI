import {
  createWorkRequest,
  createInterpretation,
  createActionItems,
  updateWorkRequestStatus,
  createActivityEvent,
  type WorkRequest,
  type Interpretation,
  type ActionItem,
} from "@/lib/db/service";
import { interpretWorkRequest, type InterpretOptions } from "./interpreter";
import type { InterpretationResult } from "./schemas";

export interface IntakeResult {
  workRequest: WorkRequest;
  interpretationResult: InterpretationResult;
  dbInterpretation: Interpretation;
  actionItems: ActionItem[];
}

/**
 * End-to-end Application Intake Flow:
 * 1. Creates initial WorkRequest (RECEIVED)
 * 2. Invokes AI Interpreter engine
 * 3. Saves structured Interpretation in database
 * 4. Creates extracted ActionItems in database
 * 5. Records ActivityEvents for observability
 */
export async function processIntakeRequest(
  rawInput: string,
  options: InterpretOptions = {}
): Promise<IntakeResult> {
  const trimmed = rawInput?.trim();
  if (!trimmed) {
    throw new Error("Work request input text cannot be empty.");
  }

  // Step 1: Create initial WorkRequest record in database
  const workRequest = await createWorkRequest(trimmed);

  // Step 2: Log interpretation started activity event
  await createActivityEvent(
    workRequest.id,
    "INTERPRETATION_STARTED",
    "AI interpretation engine started processing request."
  );

  let interpretationResult: InterpretationResult;

  try {
    // Step 3: Call AI Interpreter engine
    interpretationResult = await interpretWorkRequest(trimmed, options);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "AI interpretation failed.";

    // Record failure in activity trace & update WorkRequest status to FAILED
    await createActivityEvent(
      workRequest.id,
      "INTERPRETATION_FAILED",
      `AI interpretation failed: ${errorMessage}`
    );
    await updateWorkRequestStatus(workRequest.id, "FAILED");

    throw error;
  }

  // Step 4: Save structured Interpretation in database (automatically sets status = INTERPRETED)
  const dbInterpretation = await createInterpretation({
    workRequestId: workRequest.id,
    title: interpretationResult.title,
    summary: interpretationResult.summary,
    priority: interpretationResult.priority,
    detectedDeadline: interpretationResult.detectedDeadline
      ? new Date(interpretationResult.detectedDeadline)
      : null,
    missingInformation: interpretationResult.missingInformation,
    automatableActions: interpretationResult.automatableActions,
    humanConfirmationReqs: interpretationResult.humanConfirmationRequired,
  });

  // Step 5: Save extracted ActionItems in database
  const actionItemsInput = interpretationResult.actionItems.map((item) => ({
    description: item.description,
    priority: item.priority ?? interpretationResult.priority,
    dueAt: item.deadline ? new Date(item.deadline) : null,
    actionType: item.type ?? "OTHER",
    status: "PENDING" as const,
  }));

  const actionItems = await createActionItems(workRequest.id, actionItemsInput);

  return {
    workRequest,
    interpretationResult,
    dbInterpretation,
    actionItems,
  };
}
