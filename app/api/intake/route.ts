import { NextResponse } from "next/server";
import { processIntakeRequest } from "@/lib/ai";
import { getWorkRequest } from "@/lib/db/service";
import { createApiErrorResponse } from "@/lib/utils/api-response";

const MAX_REQUEST_TEXT_LENGTH = 10000;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const requestText = body?.requestText ?? body?.text;

    if (!requestText || typeof requestText !== "string" || !requestText.trim()) {
      return createApiErrorResponse(
        "INVALID_INPUT",
        "Field 'text' or 'requestText' is required and must be a non-empty string.",
        400
      );
    }

    if (requestText.length > MAX_REQUEST_TEXT_LENGTH) {
      return createApiErrorResponse(
        "PAYLOAD_TOO_LARGE",
        `Work request text exceeds the maximum limit of ${MAX_REQUEST_TEXT_LENGTH} characters.`,
        413
      );
    }

    const result = await processIntakeRequest(requestText);
    const fullRequest = await getWorkRequest(result.workRequest.id);

    return NextResponse.json(
      {
        message: "Work request submitted and interpreted successfully.",
        workRequestId: result.workRequest.id,
        workRequest: fullRequest ?? result.workRequest,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error during intake.";
    console.error(`[POST /api/intake Error]:`, error);
    return createApiErrorResponse("INTAKE_FAILED", errorMessage, 500);
  }
}
