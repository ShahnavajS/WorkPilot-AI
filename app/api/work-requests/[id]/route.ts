import { NextResponse } from "next/server";
import { getWorkRequest } from "@/lib/db/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "WorkRequest ID is required." }, { status: 400 });
    }

    const workRequest = await getWorkRequest(id);
    if (!workRequest) {
      return NextResponse.json({ error: `WorkRequest '${id}' not found.` }, { status: 404 });
    }

    return NextResponse.json({ workRequest }, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error fetching work request.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
