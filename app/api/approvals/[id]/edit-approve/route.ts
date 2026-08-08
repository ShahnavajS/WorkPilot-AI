import { NextResponse } from "next/server";
import { editAndApproveStep } from "@/lib/engine";
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
    const editedContent = body?.editedContent;

    if (!editedContent || typeof editedContent !== "string" || !editedContent.trim()) {
      return createApiErrorResponse("INVALID_INPUT", "Field 'editedContent' is required and must be a non-empty string.", 400);
    }

    const result = await editAndApproveStep(approvalId, editedContent, body?.reviewerNote);

    return NextResponse.json({ message: "Approval edited and granted successfully.", ...result }, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error editing and approving step.";
    console.error(`[POST /api/approvals/[id]/edit-approve Error]:`, error);

    if (msg.includes("not found")) {
      return createApiErrorResponse("APPROVAL_NOT_FOUND", msg, 404);
    }
    if (msg.includes("already resolved")) {
      return createApiErrorResponse("APPROVAL_ALREADY_RESOLVED", msg, 409);
    }

    return createApiErrorResponse("EDIT_APPROVAL_FAILED", msg, 500);
  }
}
