import { NextResponse } from "next/server";
import { rejectStep } from "@/lib/engine";

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
    const result = await rejectStep(approvalId, body?.reviewerNote);

    return NextResponse.json({ message: "Approval rejected.", ...result }, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error rejecting step.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
