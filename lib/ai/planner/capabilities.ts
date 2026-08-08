/**
 * Tool Capability Registry for WorkPilot AI Planner
 */

export interface ToolCapability {
  name: string;
  description: string;
  supportedActionTypes: string[];
  requiresHumanApproval: boolean;
  bounds: string;
}

export const TOOL_CAPABILITY_REGISTRY: Record<string, ToolCapability> = {
  create_task: {
    name: "create_task",
    description: "Creates a persistent task/action record in the database.",
    supportedActionTypes: ["TASK", "REMINDER"],
    requiresHumanApproval: false,
    bounds: "Writes to local PostgreSQL database only. Does not trigger external side effects.",
  },
  draft_communication: {
    name: "draft_communication",
    description: "Creates a communication draft (e.g. thank-you email text).",
    supportedActionTypes: ["COMMUNICATION"],
    requiresHumanApproval: true, // Always requires human review before send
    bounds: "Prepares a draft artifact in database only. Does NOT send real external emails.",
  },
  generate_brief: {
    name: "generate_brief",
    description: "Generates a Markdown executive work brief from structured requests.",
    supportedActionTypes: ["REPORT"],
    requiresHumanApproval: false,
    bounds: "Writes a persistent Markdown brief artifact in the database.",
  },
  website_check: {
    name: "website_check",
    description: "Performs bounded automated website technical inspection.",
    supportedActionTypes: ["WEBSITE_CHECK"],
    requiresHumanApproval: false,
    bounds: "Performs HTTP availability check, response timing, and page title extraction.",
  },
};

/**
 * Finds matching tool capability by tool name.
 */
export function getToolByName(name: string): ToolCapability | null {
  return TOOL_CAPABILITY_REGISTRY[name] ?? null;
}

/**
 * Finds matching tool capability for a given action category/type.
 */
export function findCapabilityForActionType(actionType?: string | null): ToolCapability | null {
  if (!actionType) return null;
  const upperType = actionType.toUpperCase();
  for (const cap of Object.values(TOOL_CAPABILITY_REGISTRY)) {
    if (cap.supportedActionTypes.includes(upperType)) {
      return cap;
    }
  }
  return null;
}
