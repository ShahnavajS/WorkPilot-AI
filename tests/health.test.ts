import { describe, it, expect, vi } from "vitest";
import { GET } from "@/app/api/health/route";

// Mock Prisma to avoid DB dependency in unit tests
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
  },
}));

describe("Health API Endpoint (GET /api/health)", () => {
  it("returns 200 status with service metadata and database status", async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("ok");
    expect(data.service).toBe("workpilot-ai");
    expect(data.database).toBe("connected");
    expect(data).toHaveProperty("timestamp");
  });
});
