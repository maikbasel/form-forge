"use server";

import { createApiClient } from "@repo/api-spec/client";
import type { ListSheetFieldsResponse } from "@repo/api-spec/model";
import { API_BASE_URL, type FormField } from "@repo/ui/lib/api.ts";
import { ApiClientError, parseApiError } from "@repo/ui/types/api.ts";

// Create client for direct backend calls (server-side)
const client = createApiClient(API_BASE_URL);

export async function getSheetFields(sheetId: string): Promise<FormField[]> {
  const { data, error, response } = await client.GET<ListSheetFieldsResponse>(
    "/sheets/{sheet_id}/fields",
    {
      params: { path: { sheet_id: sheetId } },
    }
  );

  if (error) {
    const apiError = parseApiError(error);
    throw new ApiClientError(response.status, apiError);
  }

  return data?.fields ?? [];
}
