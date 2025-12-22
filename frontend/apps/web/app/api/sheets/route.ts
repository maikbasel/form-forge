import { API_BASE_URL } from "@repo/ui/lib/api";
import { ApiClientError, ApiErrorSchema } from "@repo/ui/types/api";
import { UploadSheetResponseSchema } from "@repo/ui/types/sheet";
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
      const parsedError = ApiErrorSchema.safeParse(data);
      const apiError = parsedError.success
        ? parsedError.data
        : {
            message:
              typeof data === "object" &&
              data !== null &&
              "message" in data &&
              typeof data.message === "string"
                ? data.message
                : "Unknown error",
          };

      return NextResponse.json(apiError, { status: response.status });
    }

    const data = await response.json();
    const parsed = UploadSheetResponseSchema.parse(data);
    const location = response.headers.get("location");

    if (!location) {
      return NextResponse.json(
        { message: "Missing Location header in response" },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed, {
      status: response.status,
      headers: {
        Location: location,
      },
    });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json(error.apiError, { status: error.statusCode });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
