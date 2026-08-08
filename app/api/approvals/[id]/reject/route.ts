import { NextResponse } from "next/server";
import { rejectStep } from "@/lib/engine";
import { createApiErrorResponse } from "@/lib/utils/api-response";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: approvalId } = await params;
    if (!approvalId) {
      return createApiErrorResponse("INVALID_INPUT", "Approval ID parameter is required.", 400);
    }

    const body = await request.json().catch(() => ({}));
    const result = await rejectStep(approvalId, body?.reviewerNote);

    return NextResponse.json({ message: "Approval rejected successfully.", ...result }, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error rejecting step.";
    console.error(`[POST /api/approvals/[id]/reject Error]:`, error);

    if (msg.includes("not found")) {
      return createApiErrorResponse("APPROVAL_NOT_FOUND", msg, 404);
    }
    if (msg.includes("already resolved")) {
      return createApiErrorResponse("APPROVAL_ALREADY_RESOLVED", msg, 409);
    }

    return createApiErrorResponse("REJECTION_FAILED", msg, 500);
  }
}
