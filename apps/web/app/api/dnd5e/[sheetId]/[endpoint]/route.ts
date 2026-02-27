import { API_BASE_URL } from "@repo/ui/lib/api.ts";
import { parseApiError } from "@repo/ui/types/api.ts";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sheetId: string; endpoint: string }> }
) {
  try {
    const { sheetId, endpoint } = await params;

    const response = await fetch(
      `${API_BASE_URL}/dnd5e/${sheetId}/${endpoint}`,
      {
        method: "GET",
      }
    );

    if (!response.ok) {
      const data = await response
        .json()
        .catch(() => ({ message: "Unknown error" }));
      const apiError = parseApiError(data);

      return NextResponse.json(apiError, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ sheetId: string; endpoint: string }> }
) {
  try {
    const { sheetId, endpoint } = await params;
    const body = await request.json();

    const response = await fetch(
      `${API_BASE_URL}/dnd5e/${sheetId}/${endpoint}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const data = await response
        .json()
        .catch(() => ({ message: "Unknown error" }));
      const apiError = parseApiError(data);

      return NextResponse.json(apiError, { status: response.status });
    }

    return new NextResponse(null, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
