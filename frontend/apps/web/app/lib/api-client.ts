import type { ApiClient } from "@repo/ui/api/api-client";
import type {
  AppliedAction,
  FormField,
  UploadOptions,
  UploadSheetResult,
} from "@repo/ui/api/types";
import {
  ApiClientError,
  ApiErrorSchema,
  ListSheetFieldsResponseSchema,
  UploadSheetResponseSchema,
} from "@repo/ui/api/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      message: response.statusText,
    }));

    const parsedError = ApiErrorSchema.safeParse(errorData);
    const apiError = parsedError.success
      ? parsedError.data
      : { message: errorData.message || "Unknown error" };

    throw new ApiClientError(response.status, apiError);
  }

  return response.json();
}

function handleUploadSuccess(
  xhr: XMLHttpRequest,
  resolve: (value: UploadSheetResult) => void,
  reject: (error: ApiClientError) => void
): void {
  try {
    const responseData = JSON.parse(xhr.responseText);
    const parsed = UploadSheetResponseSchema.parse(responseData);
    const location = xhr.getResponseHeader("Location");

    if (!location) {
      reject(
        ApiClientError.fromResponse(
          xhr.status,
          "Missing Location header in response"
        )
      );
      return;
    }

    resolve({
      id: parsed.id,
      location,
    });
  } catch (error) {
    reject(
      ApiClientError.fromResponse(
        xhr.status,
        error instanceof Error ? error.message : "Invalid response"
      )
    );
  }
}

function handleUploadError(
  xhr: XMLHttpRequest,
  reject: (error: ApiClientError) => void
): void {
  try {
    const errorData = JSON.parse(xhr.responseText);
    const parsedError = ApiErrorSchema.safeParse(errorData);
    const apiError = parsedError.success
      ? parsedError.data
      : { message: errorData.message || "Upload failed" };

    reject(new ApiClientError(xhr.status, apiError));
  } catch {
    reject(
      ApiClientError.fromResponse(xhr.status, xhr.statusText || "Upload failed")
    );
  }
}

function setupUploadListeners(
  xhr: XMLHttpRequest,
  options: UploadOptions | undefined,
  resolve: (value: UploadSheetResult) => void,
  reject: (error: ApiClientError) => void
): void {
  xhr.upload.addEventListener("progress", (event) => {
    if (event.lengthComputable && options?.onProgress) {
      const progress = (event.loaded / event.total) * 100;
      options.onProgress(progress);
    }
  });

  xhr.addEventListener("load", () => {
    const isSuccess = xhr.status >= 200 && xhr.status < 300;
    if (isSuccess) {
      handleUploadSuccess(xhr, resolve, reject);
    } else {
      handleUploadError(xhr, reject);
    }
  });

  xhr.addEventListener("error", () => {
    reject(
      ApiClientError.fromResponse(xhr.status, "Network error during upload")
    );
  });

  xhr.addEventListener("abort", () => {
    reject(ApiClientError.fromResponse(0, "Upload aborted"));
  });

  if (options?.signal) {
    options.signal.addEventListener("abort", () => {
      xhr.abort();
    });
  }
}

export const apiClient: ApiClient = {
  uploadSheet(file: File, options?: UploadOptions): Promise<UploadSheetResult> {
    const formData = new FormData();
    formData.append("sheet", file);

    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      setupUploadListeners(xhr, options, resolve, reject);
      xhr.open("POST", `${API_BASE_URL}/sheets`);
      xhr.send(formData);
    });
  },

  async getSheetFields(sheetId: string): Promise<FormField[]> {
    const response = await fetch(
      `${API_BASE_URL}/sheets/${sheetId}/fields`
    );
    const data = await handleResponse<unknown>(response);
    const parsed = ListSheetFieldsResponseSchema.parse(data);
    return parsed.fields;
  },

  async downloadSheet(sheetId: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/sheets/${sheetId}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: response.statusText,
      }));

      const parsedError = ApiErrorSchema.safeParse(errorData);
      const apiError = parsedError.success
        ? parsedError.data
        : { message: errorData.message || "Unknown error" };

      throw new ApiClientError(response.status, apiError);
    }

    return response.blob();
  },

  async applyAction(sheetId: string, action: AppliedAction): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/sheets/${sheetId}/actions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(action),
    });

    await handleResponse<void>(response);
  },
};
