import { z } from "zod";
import { createArtifact } from "@/lib/db/service";
import type { ToolDefinition, ToolContext } from "./types";

export const GenerateBriefInputSchema = z.object({
  title: z.string().min(1, "Brief title is required."),
  requestSummary: z.string().min(1, "Request summary is required."),
  actionItemSummaries: z.array(z.string()).optional().default([]),
  priority: z.string().optional().default("MEDIUM"),
});

export type GenerateBriefInput = z.infer<typeof GenerateBriefInputSchema>;

export const GenerateBriefOutputSchema = z.object({
  artifactId: z.string(),
  title: z.string(),
  markdownContent: z.string(),
  format: z.literal("markdown"),
});

export type GenerateBriefOutput = z.infer<typeof GenerateBriefOutputSchema>;

export const generateBriefTool: ToolDefinition<GenerateBriefInput, GenerateBriefOutput> = {
  name: "generate_brief",
  description: "Generates a structured Markdown executive work brief from context and persists it as an Artifact.",
  sideEffect: "CREATE_ARTIFACT",
  requiresHumanApproval: false,
  inputSchema: GenerateBriefInputSchema,
  outputSchema: GenerateBriefOutputSchema,
  execute: async (input: GenerateBriefInput, context: ToolContext): Promise<GenerateBriefOutput> => {
    const { workRequestId, executionStepId, currentTimestamp = new Date() } = context;

    const actionListMarkdown =
      input.actionItemSummaries.length > 0
        ? input.actionItemSummaries.map((item) => `- ${item}`).join("\n")
        : "- No granular action items recorded.";

    const markdownContent = `
# Executive Work Brief: ${input.title}

**Generated At**: ${currentTimestamp.toISOString()}  
**Priority**: ${input.priority}  
**WorkRequest ID**: \`${workRequestId}\`  

---

## 1. Executive Summary
${input.requestSummary}

## 2. Action Items & Execution Plan
${actionListMarkdown}

## 3. Governance & System Policy
- All communication drafts require explicit human approval before send.
- Persistent tasks are recorded in the PostgreSQL database.
- Bounded network checks enforce 10s timeouts and zero SSRF protocol risks.

---
*Generated automatically by WorkPilot AI Engine*
`.trim();

    const artifact = await createArtifact({
      workRequestId,
      executionStepId,
      type: "MARKDOWN_BRIEF",
      title: `Brief: ${input.title}`,
      content: markdownContent,
      metadata: {
        priority: input.priority,
        actionCount: input.actionItemSummaries.length,
        format: "markdown",
      },
    });

    return {
      artifactId: artifact.id,
      title: input.title,
      markdownContent,
      format: "markdown",
    };
  },
};
