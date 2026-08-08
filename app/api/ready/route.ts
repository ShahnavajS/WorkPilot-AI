import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Attempt lightweight raw query to test PostgreSQL connection
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      {
        status: "ready",
        service: "workpilot-ai",
        database: "connected",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Database connection failed";
    console.error(`[Readiness Probe Failed]: ${errorMsg}`);
    return NextResponse.json(
      {
        status: "not_ready",
        service: "workpilot-ai",
        database: "disconnected",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
