import { NextResponse } from "next/server";
import { executeWorkRequest } from "@/lib/engine";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workRequestId } = await params;
    if (!workRequestId) {
      return NextResponse.json({ error: "WorkRequest ID is required." }, { status: 400 });
    }

    const summary = await executeWorkRequest(workRequestId);
    return NextResponse.json({ message: "Execution processed successfully.", summary }, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error executing work request.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
