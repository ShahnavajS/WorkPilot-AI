import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { PriorityLevelSchema } from "@/lib/ai/schemas";
import type { ToolDefinition, ToolContext } from "./types";

export const CreateTaskInputSchema = z.object({
  title: z.string().min(1, "Task title is required."),
  description: z.string().optional(),
  priority: PriorityLevelSchema.optional().default("MEDIUM"),
  dueAt: z.string().nullable().optional(),
  actionType: z.string().optional().default("TASK"),
});

export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;

export const CreateTaskOutputSchema = z.object({
  taskId: z.string(),
  title: z.string(),
  status: z.string(),
  actionType: z.string(),
  dueAt: z.string().nullable(),
  createdNew: z.boolean(),
});

export type CreateTaskOutput = z.infer<typeof CreateTaskOutputSchema>;

export const createTaskTool: ToolDefinition<CreateTaskInput, CreateTaskOutput> = {
  name: "create_task",
  description: "Creates a persistent task or reminder record in the PostgreSQL database.",
  sideEffect: "DATABASE_WRITE",
  requiresHumanApproval: false,
  inputSchema: CreateTaskInputSchema,
  outputSchema: CreateTaskOutputSchema,
  execute: async (input: CreateTaskInput, context: ToolContext): Promise<CreateTaskOutput> => {
    const { workRequestId, executionStepId } = context;

    // Idempotency check: Check if an ActionItem already exists for this executionStepId or title
    let existingItem = null;
    if (executionStepId) {
      const step = await prisma.executionStep.findUnique({
        where: { id: executionStepId },
        include: { actionItem: true },
      });
      if (step?.actionItem) {
        existingItem = step.actionItem;
      }
    }

    if (!existingItem) {
      existingItem = await prisma.actionItem.findFirst({
        where: {
          workRequestId,
          description: input.title,
        },
      });
    }

    if (existingItem) {
      // Return existing task without duplicating
      return {
        taskId: existingItem.id,
        title: existingItem.description,
        status: existingItem.status,
        actionType: existingItem.actionType ?? "TASK",
        dueAt: existingItem.dueAt ? existingItem.dueAt.toISOString() : null,
        createdNew: false,
      };
    }

    // Persist new ActionItem in database
    const dueDate = input.dueAt ? new Date(input.dueAt) : null;
    const newTask = await prisma.actionItem.create({
      data: {
        workRequestId,
        description: input.title + (input.description ? `: ${input.description}` : ""),
        status: "PLANNED",
        priority: input.priority ?? "MEDIUM",
        dueAt: dueDate,
        actionType: input.actionType ?? "TASK",
      },
    });

    // Link created ActionItem back to execution step if provided
    if (executionStepId) {
      await prisma.executionStep.update({
        where: { id: executionStepId },
        data: { actionItemId: newTask.id },
      });
    }

    return {
      taskId: newTask.id,
      title: newTask.description,
      status: newTask.status,
      actionType: newTask.actionType ?? "TASK",
      dueAt: newTask.dueAt ? newTask.dueAt.toISOString() : null,
      createdNew: true,
    };
  },
};
