"use server";

import { createApiClient } from "@repo/api-spec/client";
import type {
  ListSheetFieldsResponse,
  ProblemDetails,
} from "@repo/api-spec/model";
import { API_BASE_URL, type FormField } from "@repo/ui/lib/api.ts";
import { parseApiError } from "@repo/ui/types/api.ts";

// Create client for direct backend calls (server-side)
const client = createApiClient(API_BASE_URL);

/**
 * Errors thrown from a server action reach the client stripped of custom
 * properties (and, in production, of their message), so failures are returned
 * as data and turned back into an ApiClientError by the caller.
 */
export type SheetFieldsResult =
  | { fields: FormField[]; ok: true }
  | { ok: false; problem: ProblemDetails; status: number };

export async function getSheetFields(
  sheetId: string
): Promise<SheetFieldsResult> {
  const { data, error, response } = await client.GET<ListSheetFieldsResponse>(
    "/sheets/{sheet_id}/fields",
    {
      params: { path: { sheet_id: sheetId } },
    }
  );

  if (error) {
    return {
      ok: false,
      status: response.status,
      problem: parseApiError(error),
    };
  }

  return { ok: true, fields: data?.fields ?? [] };
}
