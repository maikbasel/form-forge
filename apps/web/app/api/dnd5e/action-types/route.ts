import { API_BASE_URL } from "@repo/ui/lib/api.ts";
import { parseApiError } from "@repo/ui/types/api.ts";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch(`${API_BASE_URL}/dnd5e/action-types`, {
      method: "GET",
    });

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
