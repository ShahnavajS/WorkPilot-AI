import { NextResponse } from "next/server";
import { processIntakeRequest } from "@/lib/ai";
import { getWorkRequest } from "@/lib/db/service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const requestText = body?.requestText;

    if (!requestText || typeof requestText !== "string" || !requestText.trim()) {
      return NextResponse.json(
        { error: "Field 'requestText' is required and must be a non-empty string." },
        { status: 400 }
      );
    }

    const result = await processIntakeRequest(requestText);
    const fullRequest = await getWorkRequest(result.workRequest.id);

    return NextResponse.json(
      {
        message: "Work request submitted and interpreted successfully.",
        workRequest: fullRequest ?? result.workRequest,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error during intake.";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
