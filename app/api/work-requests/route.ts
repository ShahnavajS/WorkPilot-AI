import { NextResponse } from "next/server";
import { listWorkRequests } from "@/lib/db/service";

export async function GET() {
  try {
    const requests = await listWorkRequests(20);
    return NextResponse.json({ requests }, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error listing work requests.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
