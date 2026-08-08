import { NextResponse } from "next/server";

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export function createApiErrorResponse(
  code: string,
  message: string,
  status = 400,
  details?: any
): NextResponse<ApiErrorPayload> {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details && { details }),
      },
    },
    { status }
  );
}
