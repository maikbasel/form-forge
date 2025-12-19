import { ApiErrorSchema } from "@repo/ui/types/api";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_URL || "http://localhost:8081";

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

    // Get the blob data from the backend
    const blob = await response.blob();

    // Forward the response with the same content type
    return new NextResponse(blob, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("Content-Type") || "application/pdf",
        "Content-Disposition":
          response.headers.get("Content-Disposition") ||
          `attachment; filename="${sheetId}.pdf"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
