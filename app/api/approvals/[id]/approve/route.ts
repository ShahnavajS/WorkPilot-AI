import { NextResponse } from "next/server";
import { approveStep } from "@/lib/engine";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: approvalId } = await params;
    if (!approvalId) {
      return NextResponse.json({ error: "Approval ID is required." }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const result = await approveStep(approvalId, body?.reviewerNote);

    return NextResponse.json({ message: "Approval granted successfully.", ...result }, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error approving step.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
