import { z } from "zod";
import OpenAI from "openai";

export type SideEffectType =
  | "DATABASE_WRITE"
  | "CREATE_ARTIFACT"
  | "NETWORK_READ_ONLY"
  | "NONE";

export interface ToolContext {
  workRequestId: string;
  executionStepId?: string | null;
  currentTimestamp?: Date;
  openaiClient?: OpenAI;
}

export interface ToolError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ToolResult<TOutput = any> {
  success: boolean;
  toolName: string;
  output: TOutput | null;
  error: ToolError | null;
  executionId?: string;
}

export interface ToolDefinition<TInput = any, TOutput = any> {
  name: string;
  description: string;
  sideEffect: SideEffectType;
  requiresHumanApproval: boolean;
  inputSchema: z.ZodType<TInput, z.ZodTypeDef, any>;
  outputSchema: z.ZodType<TOutput, z.ZodTypeDef, any>;
  execute: (input: TInput, context: ToolContext) => Promise<TOutput>;
}
