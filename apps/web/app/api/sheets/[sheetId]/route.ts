import { API_BASE_URL } from "@repo/ui/lib/api.ts";
import { parseApiError } from "@repo/ui/types/api.ts";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sheetId: string }> }
) {
  try {
    const { sheetId } = await params;

    const response = await fetch(`${API_BASE_URL}/sheets/${sheetId}`, {
      method: "GET",
    });

    if (!response.ok) {
      const data = await response
        .json()
        .catch(() => ({ message: "Unknown error" }));
      const apiError = parseApiError(data);

      return NextResponse.json(apiError, { status: response.status });
    }

    // Backend now returns JSON with pre-signed URL
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
