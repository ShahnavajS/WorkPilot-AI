import type { ActionItem, Interpretation } from "@/lib/db/service";
import { TOOL_CAPABILITY_REGISTRY } from "./capabilities";

export const PLANNER_SYSTEM_PROMPT = `
You are the Agentic Work Planner engine for WorkPilot AI.
Your job is to analyze an Interpretation and its extracted Action Items, and assign each action item to a safe execution route.

AVAILABLE REGISTERED TOOL CAPABILITIES:
${JSON.stringify(TOOL_CAPABILITY_REGISTRY, null, 2)}

THE FOUR ALLOWED EXECUTION ROUTES:
1. "EXECUTE_AUTOMATICALLY": Bounded, safe action with a matching registered tool and no external side-effects requiring human confirmation.
2. "PREPARE_FOR_HUMAN_REVIEW": Action requires preparing a draft or artifact for human review/approval before completion (e.g. communication drafts).
3. "CANNOT_EXECUTE": Requested action is outside available prototype capabilities (e.g. bulk email sending, SMS, live calendar sync).
4. "REQUIRES_CLARIFICATION": Essential facts (recipients, file links, target URLs) are missing, preventing safe execution.

PLANNING RULES:
- Every actionItem MUST be assigned exactly one route.
- If missingInformation is present for an action, route to "REQUIRES_CLARIFICATION".
- If no tool exists in the registry for an action, route to "CANNOT_EXECUTE".
- Never invent tool names that are not in the registry.
- Be conservative: When in doubt, prefer PREPARE_FOR_HUMAN_REVIEW over EXECUTE_AUTOMATICALLY.
`.trim();

export function buildPlannerUserPrompt(
  interpretation: Interpretation,
  actionItems: ActionItem[]
): string {
  return `
INTERPRETATION:
Title: ${interpretation.title}
Summary: ${interpretation.summary}
Priority: ${interpretation.priority}
Missing Information: ${JSON.stringify(interpretation.missingInformation)}

ACTION ITEMS TO PLAN:
${JSON.stringify(
  actionItems.map((a) => ({
    actionItemId: a.id,
    description: a.description,
    actionType: a.actionType,
    dueAt: a.dueAt,
  })),
  null,
  2
)}
`.trim();
}
