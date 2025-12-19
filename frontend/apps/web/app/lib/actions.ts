"use server";

import type { AppliedAction } from "@repo/ui/types/action";
import { ApiClientError, ApiErrorSchema } from "@repo/ui/types/api";
import type { FormField } from "@repo/ui/types/sheet";
import { ListSheetFieldsResponseSchema } from "@repo/ui/types/sheet";

const API_BASE_URL = process.env.API_URL || "http://localhost:8081";

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

export async function applyAction(
  sheetId: string,
  action: AppliedAction
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/sheets/${sheetId}/actions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(action),
  });

  if (!response.ok) {
    const data = await response
      .json()
      .catch(() => ({ message: "Unknown error" }));
    handleFetchError(response, data);
  }
}
