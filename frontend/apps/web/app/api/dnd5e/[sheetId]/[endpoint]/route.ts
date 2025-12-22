import { ApiErrorSchema } from "@repo/ui/types/api";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_URL || "http://localhost:8081";

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

    return new NextResponse(null, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}