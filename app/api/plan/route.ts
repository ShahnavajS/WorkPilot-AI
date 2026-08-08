import { NextResponse } from "next/server";
import { generateExecutionPlan } from "@/lib/ai/planner";
import { createApiErrorResponse } from "@/lib/utils/api-response";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const workRequestId = body?.workRequestId;

    if (!workRequestId || typeof workRequestId !== "string" || !workRequestId.trim()) {
      return createApiErrorResponse(
        "INVALID_INPUT",
        "Field 'workRequestId' is required and must be a non-empty string.",
        400
      );
    }

    const planResult = await generateExecutionPlan(workRequestId);

    return NextResponse.json(
      {
        message: "Execution plan generated successfully.",
        executionPlan: planResult.executionPlan,
        plannedSteps: planResult.plannedSteps,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error during planning.";
    console.error(`[POST /api/plan Error]:`, error);

    if (errorMessage.includes("not found")) {
      return createApiErrorResponse("WORK_REQUEST_NOT_FOUND", errorMessage, 404);
    }

    return createApiErrorResponse("PLANNING_FAILED", errorMessage, 500);
  }
}
