import type { UploadSheetResponse } from "@repo/api-spec/model";
import {
  type FileApiClient,
  type FormField,
  handleAxiosError,
  handleFetchError,
  type UploadSheetResult,
} from "@repo/ui/lib/api.ts";
import type { AttachActionRequest } from "@repo/ui/types/action.ts";
import { ApiClientError } from "@repo/ui/types/api.ts";
import type {
  DownloadSheetResult,
  UploadOptions,
} from "@repo/ui/types/sheet.ts";
import axios from "axios";
import { getSheetFields as getSheetFieldsServer } from "./actions.ts";

export const apiClient: FileApiClient = {
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

      const data = response.data as UploadSheetResponse;
      const location = response.headers.location;

      if (!location) {
        // noinspection ExceptionCaughtLocallyJS
        throw ApiClientError.fromResponse(
          response.status,
          "Missing Location header in response"
        );
      }

      return {
        id: data.id,
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
    // Step 1: Get pre-signed URL from backend
    const response = await fetch(`/api/sheets/${sheetId}`, {
      method: "GET",
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({
        type: "about:blank",
        title: "Unknown error",
        status: 0,
      }));
      handleFetchError(response, data);
    }

    const { url, filename } =
      (await response.json()) as import("@repo/api-spec/model").DownloadSheetResponse;

    // Step 2: Download directly from S3 using pre-signed URL
    const downloadResponse = await fetch(url);

    if (!downloadResponse.ok) {
      throw ApiClientError.fromResponse(
        downloadResponse.status,
        `Failed to download from storage: ${downloadResponse.statusText}`
      );
    }

    const blob = await downloadResponse.blob();
    return { blob, filename };
  },

  async attachAction(
    sheetId: string,
    action: AttachActionRequest
  ): Promise<void> {
    const response = await fetch(`/api/dnd5e/${sheetId}/${action.type}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(action.mapping),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({
        type: "about:blank",
        title: "Unknown error",
        status: 0,
      }));
      handleFetchError(response, data);
    }
  },
};
