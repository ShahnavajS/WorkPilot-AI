import { z } from "zod";

// Constrained Priority Enum
export const PriorityLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
export type PriorityLevelType = z.infer<typeof PriorityLevelSchema>;

// Extracted Action Item Schema
export const ExtractedActionItemSchema = z.object({
  id: z.string().describe("Temporary unique action ID, e.g. action-1, action-2"),
  description: z.string().describe("Clear action description"),
  type: z
    .enum(["COMMUNICATION", "TASK", "REMINDER", "REPORT", "WEBSITE_CHECK", "OTHER"])
    .describe("Category of the action item"),
  priority: PriorityLevelSchema.describe("Priority level of the action item"),
  deadline: z.string().nullable().describe("ISO timestamp or null if no deadline detected"),
  requiresHumanConfirmation: z
    .boolean()
    .describe("True if this action requires explicit human confirmation before completion"),
  automationCandidate: z
    .boolean()
    .describe("True if this action appears automatable in principle"),
});

export type ExtractedActionItem = z.infer<typeof ExtractedActionItemSchema>;

// Canonical Structured Interpretation Schema
export const InterpretationResultSchema = z.object({
  title: z.string().describe("Short descriptive task or work title"),
  summary: z.string().describe("Concise summary of what the user is requesting"),
  priority: PriorityLevelSchema.describe("Overall priority of the work request"),
  detectedDeadline: z
    .string()
    .nullable()
    .describe("Normalized ISO timestamp string if deadline detected, otherwise null"),
  actionItems: z.array(ExtractedActionItemSchema).describe("List of concrete extracted action items"),
  missingInformation: z
    .array(z.string())
    .describe("Concrete missing facts required to complete work safely (e.g. email addresses, missing files)"),
  automatableActions: z
    .array(z.string())
    .describe("IDs of action items suitable for potential automation"),
  humanConfirmationRequired: z
    .array(z.string())
    .describe("IDs of action items requiring human approval before completion"),
});

export type InterpretationResult = z.infer<typeof InterpretationResultSchema>;
