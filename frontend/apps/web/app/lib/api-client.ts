import type { ApiClient } from "@repo/ui/api/api-client";
import type {
  AppliedAction,
  FormField,
  UploadOptions,
  UploadSheetResult,
} from "@repo/ui/types/types";
import {
  ApiClientError,
  ApiErrorSchema,
  ListSheetFieldsResponseSchema,
  UploadSheetResponseSchema,
} from "@repo/ui/types/types";
import axios, { type AxiosError } from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

function handleAxiosError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status || 0;
    const errorData = axiosError.response?.data || {
      message: axiosError.message,
    };

    const parsedError = ApiErrorSchema.safeParse(errorData);
    const apiError = parsedError.success
      ? parsedError.data
      : {
          message:
            typeof errorData === "object" &&
            errorData !== null &&
            "message" in errorData &&
            typeof errorData.message === "string"
              ? errorData.message
              : "Unknown error",
        };

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
      const response = await axios.post<unknown>("/sheets", formData, {
        baseURL: API_BASE_URL,
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
    try {
      const response = await axiosInstance.get<unknown>(
        `/sheets/${sheetId}/fields`
      );
      const parsed = ListSheetFieldsResponseSchema.parse(response.data);
      return parsed.fields;
    } catch (error) {
      handleAxiosError(error);
    }
  },

  async downloadSheet(sheetId: string): Promise<Blob> {
    try {
      const response = await axiosInstance.get<Blob>(`/sheets/${sheetId}`, {
        responseType: "blob",
      });
      return response.data;
    } catch (error) {
      handleAxiosError(error);
    }
  },

  async applyAction(sheetId: string, action: AppliedAction): Promise<void> {
    try {
      await axiosInstance.post(`/sheets/${sheetId}/actions`, action);
    } catch (error) {
      handleAxiosError(error);
    }
  },
};
