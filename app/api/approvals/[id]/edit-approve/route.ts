import { NextResponse } from "next/server";
import { editAndApproveStep } from "@/lib/engine";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: approvalId } = await params;
    if (!approvalId) {
      return NextResponse.json({ error: "Approval ID is required." }, { status: 400 });
    }

    const body = await request.json();
    const editedContent = body?.editedContent;

    if (!editedContent || typeof editedContent !== "string") {
      return NextResponse.json({ error: "Field 'editedContent' is required." }, { status: 400 });
    }

    const result = await editAndApproveStep(approvalId, editedContent, body?.reviewerNote);

    return NextResponse.json({ message: "Content updated and approval granted.", ...result }, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error editing and approving step.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
