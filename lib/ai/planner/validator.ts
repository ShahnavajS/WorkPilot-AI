import type { ActionItem, Interpretation } from "@/lib/db/service";
import { getToolByName, findCapabilityForActionType } from "./capabilities";
import type { PlannedStep } from "./schemas";

export interface ValidationContext {
  actionItems: ActionItem[];
  interpretation?: Interpretation | null;
}

/**
 * Deterministic Safety Validator for Agentic Planner.
 * Enforces explicit boundaries:
 * 1. Guarantees 1:1 coverage of all ActionItems.
 * 2. Overrides automatic execution if human confirmation is required.
 * 3. Enforces clarification if required info is missing.
 * 4. Ensures toolName strictly matches registered capabilities.
 */
export function validateAndEnforcePlanSafety(
  candidateSteps: PlannedStep[],
  context: ValidationContext
): PlannedStep[] {
  const { actionItems, interpretation } = context;

  const missingInfoList = Array.isArray(interpretation?.missingInformation)
    ? (interpretation.missingInformation as string[])
    : [];

  const validatedSteps: PlannedStep[] = [];

  for (const action of actionItems) {
    // Find candidate step from LLM output or generate default candidate
    let step = candidateSteps.find((s) => s.actionItemId === action.id);

    if (!step) {
      // Fallback candidate if LLM omitted the action item
      const cap = findCapabilityForActionType(action.actionType);
      step = {
        actionItemId: action.id,
        route: cap ? (cap.requiresHumanApproval ? "PREPARE_FOR_HUMAN_REVIEW" : "EXECUTE_AUTOMATICALLY") : "CANNOT_EXECUTE",
        toolName: cap ? cap.name : null,
        reason: cap ? `Routed based on available capability '${cap.name}'.` : "No matching tool capability available.",
        requiresApproval: cap ? cap.requiresHumanApproval : false,
        clarificationRequired: false,
      };
    }

    let route = step.route;
    let toolName = step.toolName;
    let reason = step.reason;
    let requiresApproval = step.requiresApproval;
    let clarificationRequired = step.clarificationRequired;

    // Check 1: Tool Capability Validation
    if (toolName) {
      const registeredCap = getToolByName(toolName);
      if (!registeredCap) {
        // Unknown tool attempted! Force CANNOT_EXECUTE
        route = "CANNOT_EXECUTE";
        reason = `Tool '${toolName}' is not registered in this application's capabilities.`;
        toolName = null;
      }
    } else if (route === "EXECUTE_AUTOMATICALLY" || route === "PREPARE_FOR_HUMAN_REVIEW") {
      // Try to find matching registered tool by actionType
      const matchedCap = findCapabilityForActionType(action.actionType);
      if (matchedCap) {
        toolName = matchedCap.name;
      } else {
        route = "CANNOT_EXECUTE";
        reason = `No tool capability exists for action type '${action.actionType ?? "unknown"}'.`;
      }
    }

    // Check 2: Missing Information & Ambiguity Check
    const isMissingInfoRelevant = missingInfoList.length > 0 && (
      action.description.toLowerCase().includes("everyone") ||
      action.description.toLowerCase().includes("doc") ||
      action.description.toLowerCase().includes("website") ||
      action.description.toLowerCase().includes("meeting") ||
      action.description.toLowerCase().includes("email")
    );

    if (isMissingInfoRelevant || clarificationRequired) {
      route = "REQUIRES_CLARIFICATION";
      toolName = null;
      clarificationRequired = true;
      reason = `Requires clarification: ${missingInfoList.join("; ") || "Missing required information for safe execution."}`;
    }

    // Check 3: Human Confirmation Boundary Enforcement
    const capability = toolName ? getToolByName(toolName) : null;
    const humanApprovalNeeded =
      capability?.requiresHumanApproval ||
      step.requiresApproval ||
      action.status === "WAITING_FOR_APPROVAL";

    if (route === "EXECUTE_AUTOMATICALLY" && humanApprovalNeeded) {
      route = "PREPARE_FOR_HUMAN_REVIEW";
      requiresApproval = true;
      reason = `Action '${action.description}' involves communication or human review, so it cannot be automatically executed.`;
    }

    if (route === "PREPARE_FOR_HUMAN_REVIEW") {
      requiresApproval = true;
    }

    validatedSteps.push({
      actionItemId: action.id,
      route,
      toolName,
      reason,
      requiresApproval,
      clarificationRequired,
    });
  }

  return validatedSteps;
}
