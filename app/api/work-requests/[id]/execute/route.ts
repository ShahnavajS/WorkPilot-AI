import { NextResponse } from "next/server";
import { executeWorkRequest } from "@/lib/engine";
import { createApiErrorResponse } from "@/lib/utils/api-response";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workRequestId } = await params;
    if (!workRequestId) {
      return createApiErrorResponse("INVALID_INPUT", "WorkRequest ID parameter is required.", 400);
    }

    const summary = await executeWorkRequest(workRequestId);
    return NextResponse.json({ message: "Execution processed successfully.", summary }, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error executing work request.";
    console.error(`[POST /api/work-requests/[id]/execute Error]:`, error);

    if (msg.includes("not found")) {
      return createApiErrorResponse("WORK_REQUEST_NOT_FOUND", msg, 404);
    }
    if (msg.includes("Illegal WorkRequest state transition")) {
      return createApiErrorResponse("INVALID_WORKFLOW_STATE", msg, 409);
    }

    return createApiErrorResponse("EXECUTION_FAILED", msg, 500);
  }
}
