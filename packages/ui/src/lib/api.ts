import type { SheetFieldDto, UploadSheetResponse } from "@repo/api-spec/model";
import type { AttachActionRequest } from "@repo/ui/types/action.ts";
import { ApiClientError, parseApiError } from "@repo/ui/types/api.ts";
import type {
  DownloadSheetResult,
  UploadOptions,
} from "@repo/ui/types/sheet.ts";
import axios from "axios";

// Type aliases from generated OpenAPI spec
export type FormField = SheetFieldDto;

// Re-export types from generated OpenAPI spec
export type {
  ApiErrorResponse,
  AttachAbilityModCalcScriptRequest,
  AttachSavingThrowModifierCalculationScriptRequest,
  AttachSkillModifierCalculationScriptRequest,
  ListSheetFieldsResponse,
  UploadSheetResponse,
} from "@repo/api-spec/model";

// Keep existing result type for uploadSheet (contains id + location)
export type UploadSheetResult = UploadSheetResponse & { location?: string };

export const API_BASE_URL = process.env.API_URL ?? "http://localhost:8081";

export interface ApiClient {
  uploadSheet(file: File, options?: UploadOptions): Promise<UploadSheetResult>;
  getSheetFields(sheetId: string): Promise<FormField[]>;
  downloadSheet(sheetId: string): Promise<DownloadSheetResult>;
  attachAction(sheetId: string, action: AttachActionRequest): Promise<void>;
}

export function handleFetchError(response: Response, data: unknown): never {
  const apiError = parseApiError(data);
  throw new ApiClientError(response.status, apiError);
}

export function handleAxiosError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status || 0;
    const errorData = error.response?.data || { message: error.message };
    const apiError = parseApiError(errorData);
    throw new ApiClientError(status, apiError);
  }

  throw new ApiClientError(0, {
    message: error instanceof Error ? error.message : "Unknown error",
  });
}

export const downloadSheetFilenameRegex =
  /filename\*?=['"]?(?:UTF-8'')?([^'";\r\n]+)/;
