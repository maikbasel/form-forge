"use server";

import { API_BASE_URL } from "@repo/ui/lib/api.ts";
import { ApiClientError, ApiErrorSchema } from "@repo/ui/types/api.ts";
import type { FormField } from "@repo/ui/types/sheet.ts";
import { ListSheetFieldsResponseSchema } from "@repo/ui/types/sheet.ts";

function handleFetchError(response: Response, data: unknown): never {
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

  throw new ApiClientError(response.status, apiError);
}

export async function getSheetFields(sheetId: string): Promise<FormField[]> {
  const response = await fetch(`${API_BASE_URL}/sheets/${sheetId}/fields`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const data = await response
      .json()
      .catch(() => ({ message: "Unknown error" }));
    handleFetchError(response, data);
  }

  const data = await response.json();
  const parsed = ListSheetFieldsResponseSchema.parse(data);
  return parsed.fields;
}
