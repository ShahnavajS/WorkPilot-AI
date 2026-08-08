import { z } from "zod";

export const ExecutionRouteSchema = z.enum([
  "EXECUTE_AUTOMATICALLY",
  "PREPARE_FOR_HUMAN_REVIEW",
  "CANNOT_EXECUTE",
  "REQUIRES_CLARIFICATION",
]);

export type ExecutionRouteType = z.infer<typeof ExecutionRouteSchema>;

export const PlannedStepSchema = z.object({
  actionItemId: z.string().describe("ID of the corresponding ActionItem"),
  route: ExecutionRouteSchema.describe("Routing category decision for this action"),
  toolName: z.string().nullable().describe("Matching registered tool name if applicable, or null"),
  reason: z.string().describe("Concise user-readable explanation for this routing decision"),
  requiresApproval: z.boolean().describe("True if this step requires human approval before completion"),
  clarificationRequired: z.boolean().describe("True if missing information prevents execution"),
});

export type PlannedStep = z.infer<typeof PlannedStepSchema>;

export const PlannerOutputSchema = z.object({
  plannedSteps: z.array(PlannedStepSchema).describe("List of planned execution steps for all action items"),
});

export type PlannerOutput = z.infer<typeof PlannerOutputSchema>;
