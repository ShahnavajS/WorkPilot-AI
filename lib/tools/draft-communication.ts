import { z } from "zod";
import OpenAI from "openai";
import { createArtifact } from "@/lib/db/service";
import type { ToolDefinition, ToolContext } from "./types";

export const DraftCommunicationInputSchema = z.object({
  topic: z.string().min(1, "Topic is required."),
  context: z.string().min(1, "Context is required."),
  recipientName: z.string().nullable().optional(),
  recipientRole: z.string().nullable().optional(),
  tone: z.string().optional().default("professional"),
});

export type DraftCommunicationInput = z.infer<typeof DraftCommunicationInputSchema>;

export const DraftCommunicationOutputSchema = z.object({
  artifactId: z.string(),
  communicationType: z.string(),
  subject: z.string(),
  body: z.string(),
  recipient: z.string(),
  status: z.literal("DRAFT_ONLY"),
});

export type DraftCommunicationOutput = z.infer<typeof DraftCommunicationOutputSchema>;

export const draftCommunicationTool: ToolDefinition<DraftCommunicationInput, DraftCommunicationOutput> = {
  name: "draft_communication",
  description: "Creates a communication draft artifact in the database. Does NOT send external emails.",
  sideEffect: "CREATE_ARTIFACT",
  requiresHumanApproval: true,
  inputSchema: DraftCommunicationInputSchema,
  outputSchema: DraftCommunicationOutputSchema,
  execute: async (input: DraftCommunicationInput, context: ToolContext): Promise<DraftCommunicationOutput> => {
    const { workRequestId, executionStepId, openaiClient } = context;

    const recipient = input.recipientName?.trim()
      ? input.recipientName + (input.recipientRole ? ` (${input.recipientRole})` : "")
      : "Unknown / Missing in request";

    let subject = `Follow-up: ${input.topic}`;
    let body = `Dear ${recipient},\n\nThank you for our discussion regarding ${input.topic}.\n\nContext & Details:\n${input.context}\n\nBest regards,\nWorkPilot AI`;

    // Optionally use OpenAI if client is provided or API key is available
    if (openaiClient || process.env.OPENAI_API_KEY) {
      try {
        const openai = openaiClient ?? new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are an AI assistant drafting professional business communications. Output ONLY JSON with keys 'subject' and 'body'. Do NOT invent missing recipient names or email addresses.",
            },
            {
              role: "user",
              content: `Draft a ${input.tone} email.\nTopic: ${input.topic}\nRecipient: ${recipient}\nContext: ${input.context}`,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (parsed.subject) subject = parsed.subject;
          if (parsed.body) body = parsed.body;
        }
      } catch {
        // Fallback to deterministic template on OpenAI failure/offline test
      }
    }

    const fullTextContent = `Subject: ${subject}\n\nTo: ${recipient}\nStatus: DRAFT ONLY (Awaiting Human Review)\n\n${body}`;

    // Persist as database Artifact
    const artifact = await createArtifact({
      workRequestId,
      executionStepId,
      type: "COMMUNICATION_DRAFT",
      title: `Draft Email: ${subject}`,
      content: fullTextContent,
      metadata: {
        subject,
        body,
        recipient,
        tone: input.tone,
        status: "DRAFT_ONLY",
      },
    });

    return {
      artifactId: artifact.id,
      communicationType: "EMAIL_DRAFT",
      subject,
      body,
      recipient,
      status: "DRAFT_ONLY",
    };
  },
};
