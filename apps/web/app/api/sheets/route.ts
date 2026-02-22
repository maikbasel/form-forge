import type { UploadSheetResponse } from "@repo/api-spec/model";
import { API_BASE_URL } from "@repo/ui/lib/api.ts";
import { ApiClientError, parseApiError } from "@repo/ui/types/api.ts";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    // Forward the form data to the backend
    const response = await fetch(`${API_BASE_URL}/sheets`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const data = await response
        .json()
        .catch(() => ({ message: "Unknown error" }));
      const apiError = parseApiError(data);

      return NextResponse.json(apiError, { status: response.status });
    }

    const data = (await response.json()) as UploadSheetResponse;
    const location = response.headers.get("location");

    if (!location) {
      return NextResponse.json(
        { message: "Missing Location header in response" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        Location: location,
      },
    });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json(error.problem, { status: error.statusCode });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
