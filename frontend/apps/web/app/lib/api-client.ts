import type { ApiClient } from "@repo/ui/api/api-client";
import type { AppliedAction } from "@repo/ui/types/action";
import { ApiClientError, ApiErrorSchema } from "@repo/ui/types/api";
import type {
  DownloadSheetResult,
  FormField,
  UploadOptions,
  UploadSheetResult,
} from "@repo/ui/types/sheet";
import { UploadSheetResponseSchema } from "@repo/ui/types/sheet";
import axios from "axios";
import {
  applyAction as applyActionServer,
  getSheetFields as getSheetFieldsServer,
} from "./actions.ts";

function parseApiError(data: unknown): { message: string } {
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

function handleFetchError(response: Response, data: unknown): never {
  const apiError = parseApiError(data);
  throw new ApiClientError(response.status, apiError);
}

function handleAxiosError(error: unknown): never {
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

export const apiClient: ApiClient = {
  async uploadSheet(
    file: File,
    options?: UploadOptions
  ): Promise<UploadSheetResult> {
    const formData = new FormData();
    formData.append("sheet", file);

    try {
      // Upload to Next.js API route which proxies to backend
      const response = await axios.post<unknown>("/api/sheets", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && options?.onProgress) {
            const progress = (progressEvent.loaded / progressEvent.total) * 100;
            options.onProgress(progress);
          }
        },
        signal: options?.signal,
      });

      const parsed = UploadSheetResponseSchema.parse(response.data);
      const location = response.headers.location;

      if (!location) {
        // noinspection ExceptionCaughtLocallyJS
          throw new ApiClientError(response.status, {
          message: "Missing Location header in response",
        });
      }

      return {
        id: parsed.id,
        location,
      };
    } catch (error) {
      handleAxiosError(error);
    }
  },

  async getSheetFields(sheetId: string): Promise<FormField[]> {
    return await getSheetFieldsServer(sheetId);
  },

  async downloadSheet(sheetId: string): Promise<DownloadSheetResult> {
    const response = await fetch(`/api/sheets/${sheetId}`, {
      method: "GET",
    });

    if (!response.ok) {
      const data = await response
        .json()
        .catch(() => ({ message: "Unknown error" }));
      handleFetchError(response, data);
    }

    // Extract filename from Content-Disposition header
    const contentDisposition = response.headers.get("Content-Disposition");
    const filenameMatch = contentDisposition?.match(
      /filename\*?=['"]?(?:UTF-8'')?([^'";\r\n]+)/
    );
    const filename = filenameMatch?.[1]
      ? decodeURIComponent(filenameMatch[1])
      : `sheet-${sheetId}.pdf`;

    const blob = await response.blob();
    return { blob, filename };
  },

  async applyAction(sheetId: string, action: AppliedAction): Promise<void> {
    return await applyActionServer(sheetId, action);
  },
};
