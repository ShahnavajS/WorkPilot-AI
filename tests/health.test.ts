import { describe, it, expect, vi } from "vitest";
import { GET as healthHandler } from "@/app/api/health/route";
import { GET as readyHandler } from "@/app/api/ready/route";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(async () => [{ "?column?": 1 }]),
  },
}));

describe("Health & Readiness API Endpoints (Phase 9)", () => {
  it("GET /api/health (Liveness Probe) returns 200 status with service metadata", async () => {
    const response = await healthHandler();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe("ok");
    expect(data.service).toBe("workpilot-ai");
    expect(data).toHaveProperty("timestamp");
  });

  it("GET /api/ready (Readiness Probe) returns 200 status with database connected", async () => {
    const response = await readyHandler();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe("ready");
    expect(data.database).toBe("connected");
    expect(data).toHaveProperty("timestamp");
  });
});
