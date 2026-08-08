import {
  startToolExecution,
  completeToolExecution,
} from "@/lib/db/service";
import type { ToolDefinition, ToolContext, ToolResult } from "./types";
import { createTaskTool } from "./create-task";
import { draftCommunicationTool } from "./draft-communication";
import { generateBriefTool } from "./generate-brief";
import { websiteCheckTool } from "./website-check";

// Central Tool Registry
const TOOL_REGISTRY: Record<string, ToolDefinition<any, any>> = {
  [createTaskTool.name]: createTaskTool,
  [draftCommunicationTool.name]: draftCommunicationTool,
  [generateBriefTool.name]: generateBriefTool,
  [websiteCheckTool.name]: websiteCheckTool,
};

/**
 * Safely looks up a registered tool definition by name.
 */
export function getTool(name: string): ToolDefinition<any, any> | null {
  return TOOL_REGISTRY[name] ?? null;
}

/**
 * Lists all registered tool definitions.
 */
export function listRegisteredTools(): ToolDefinition<any, any>[] {
  return Object.values(TOOL_REGISTRY);
}

/**
 * Generic Tool Execution Function.
 * Orchestrates lookup, input validation, DB ToolExecution tracking (RUNNING -> SUCCEEDED/FAILED),
 * activity event logging, and output validation.
 */
export async function executeTool<TOutput = any, TInput = any>(
  toolName: string,
  rawInput: TInput,
  context: ToolContext
): Promise<ToolResult<TOutput>> {
  const tool = getTool(toolName);

  if (!tool) {
    return {
      success: false,
      toolName,
      output: null,
      error: {
        code: "TOOL_NOT_FOUND",
        message: `Tool '${toolName}' is not registered in the tool registry.`,
      },
    };
  }

  // Record initiation in database (status = RUNNING) & log TOOL_STARTED activity event
  const dbExecution = await startToolExecution({
    workRequestId: context.workRequestId,
    executionStepId: context.executionStepId,
    toolName,
    input: typeof rawInput === "object" && rawInput !== null ? (rawInput as Record<string, unknown>) : { value: rawInput },
  });

  // Step 1: Input Validation with Zod
  const inputValidation = tool.inputSchema.safeParse(rawInput);
  if (!inputValidation.success) {
    const errorMsg = `Input validation failed for tool '${toolName}': ${inputValidation.error.issues.map((i) => i.message).join("; ")}`;

    await completeToolExecution(dbExecution.id, {
      status: "FAILED",
      error: errorMsg,
    });

    return {
      success: false,
      toolName,
      output: null,
      error: {
        code: "INVALID_INPUT",
        message: errorMsg,
        details: { issues: inputValidation.error.issues },
      },
      executionId: dbExecution.id,
    };
  }

  // Step 2: Execute Tool
  try {
    const output = await tool.execute(inputValidation.data, context);

    // Step 3: Output Validation with Zod
    const outputValidation = tool.outputSchema.safeParse(output);
    if (!outputValidation.success) {
      const errorMsg = `Output validation failed for tool '${toolName}': ${outputValidation.error.issues.map((i) => i.message).join("; ")}`;

      await completeToolExecution(dbExecution.id, {
        status: "FAILED",
        error: errorMsg,
      });

      return {
        success: false,
        toolName,
        output: null,
        error: {
          code: "INVALID_OUTPUT",
          message: errorMsg,
        },
        executionId: dbExecution.id,
      };
    }

    // Record success in database & log TOOL_SUCCEEDED activity event
    await completeToolExecution(dbExecution.id, {
      status: "SUCCEEDED",
      output: outputValidation.data as Record<string, unknown>,
    });

    return {
      success: true,
      toolName,
      output: outputValidation.data as TOutput,
      error: null,
      executionId: dbExecution.id,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : `Tool '${toolName}' execution failed.`;

    // Record failure in database & log TOOL_FAILED activity event
    await completeToolExecution(dbExecution.id, {
      status: "FAILED",
      error: errorMsg,
    });

    return {
      success: false,
      toolName,
      output: null,
      error: {
        code: "EXECUTION_ERROR",
        message: errorMsg,
      },
      executionId: dbExecution.id,
    };
  }
}
