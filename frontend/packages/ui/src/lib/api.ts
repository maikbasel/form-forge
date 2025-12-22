import type { AttachActionRequest } from "@repo/ui/types/action";
import { ApiClientError, ApiErrorSchema } from "@repo/ui/types/api";
import type {
  DownloadSheetResult,
  FormField,
  UploadOptions,
  UploadSheetResult,
} from "@repo/ui/types/sheet";
import axios from "axios";

export const API_BASE_URL = process.env.API_URL ?? "http://localhost:8081";

export type ApiClient = {
  uploadSheet(file: File, options?: UploadOptions): Promise<UploadSheetResult>;
  getSheetFields(sheetId: string): Promise<FormField[]>;
  downloadSheet(sheetId: string): Promise<DownloadSheetResult>;
  applyAction(sheetId: string, action: AttachActionRequest): Promise<void>;
};

export function parseApiError(data: unknown): { message: string } {
  const parsedError = ApiErrorSchema.safeParse(data);
  if (parsedError.success) {
    return parsedError.data;
  }

  if (
    typeof data === "object" &&
    data !== null &&
    "message" in data &&
    typeof data.message === "string"
  ) {
    return { message: data.message };
  }

  return { message: "Unknown error" };
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

export const downloadSheetFilenameRegex = /filename\*?=['"]?(?:UTF-8'')?([^'";\r\n]+)/;
