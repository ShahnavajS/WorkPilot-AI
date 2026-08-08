import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  let dbStatus = "disconnected";
  let dbError: string | null = null;

  try {
    // Attempt lightweight raw query to test PostgreSQL connection
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch (error) {
    dbError = error instanceof Error ? error.message : "Database query failed";
  }

  return NextResponse.json(
    {
      status: "ok",
      service: "workpilot-ai",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV ?? "development",
      database: dbStatus,
      ...(dbError && { databaseError: dbError }),
    },
    { status: 200 }
  );
}
