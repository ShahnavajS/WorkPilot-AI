import { NextResponse } from "next/server";
import { generateExecutionPlan } from "@/lib/ai/planner";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const workRequestId = body?.workRequestId;

    if (!workRequestId || typeof workRequestId !== "string" || !workRequestId.trim()) {
      return NextResponse.json(
        { error: "Field 'workRequestId' is required and must be a non-empty string." },
        { status: 400 }
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
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
