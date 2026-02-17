import { AxiosError, type AxiosResponse } from "axios";
import { describe, expect, it } from "vitest";
import { ApiClientError } from "../types/api.ts";
import {
  downloadSheetFilenameRegex,
  handleAxiosError,
  handleFetchError,
} from "./api.ts";

describe("handleFetchError", () => {
  it("throws ApiClientError with correct status and parsed error", () => {
    const response = { status: 400 } as Response;
    const data = { message: "Bad request" };

    expect(() => handleFetchError(response, data)).toThrow(ApiClientError);
    try {
      handleFetchError(response, data);
    } catch (err) {
      const error = err as ApiClientError;
      expect(error.statusCode).toBe(400);
      expect(error.apiError).toEqual({ message: "Bad request" });
    }
  });
});

describe("handleAxiosError", () => {
  it("wraps Axios error with response into ApiClientError", () => {
    const axiosError = new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
      status: 422,
      data: { message: "Validation failed" },
    } as AxiosResponse);

    expect(() => handleAxiosError(axiosError)).toThrow(ApiClientError);
    try {
      handleAxiosError(axiosError);
    } catch (err) {
      const error = err as ApiClientError;
      expect(error.statusCode).toBe(422);
      expect(error.apiError).toEqual({ message: "Validation failed" });
    }
  });

  it("wraps Axios error without response into ApiClientError with status 0", () => {
    const axiosError = new AxiosError("Network Error");

    expect(() => handleAxiosError(axiosError)).toThrow(ApiClientError);
    try {
      handleAxiosError(axiosError);
    } catch (err) {
      const error = err as ApiClientError;
      expect(error.statusCode).toBe(0);
      expect(error.apiError.message).toBe("Network Error");
    }
  });

  it("wraps non-Axios Error into ApiClientError with status 0", () => {
    const error = new TypeError("fetch failed");

    expect(() => handleAxiosError(error)).toThrow(ApiClientError);
    try {
      handleAxiosError(error);
    } catch (err) {
      const apiErr = err as ApiClientError;
      expect(apiErr.statusCode).toBe(0);
      expect(apiErr.apiError.message).toBe("fetch failed");
    }
  });

  it('wraps non-Error throws with "Unknown error"', () => {
    expect(() => handleAxiosError("something")).toThrow(ApiClientError);
    try {
      handleAxiosError("something");
    } catch (err) {
      const apiErr = err as ApiClientError;
      expect(apiErr.statusCode).toBe(0);
      expect(apiErr.apiError.message).toBe("Unknown error");
    }
  });
});

describe("downloadSheetFilenameRegex", () => {
  it("extracts filename from quoted Content-Disposition", () => {
    const header = 'attachment; filename="report.pdf"';
    const match = downloadSheetFilenameRegex.exec(header);
    expect(match?.[1]).toBe("report.pdf");
  });

  it("extracts filename from UTF-8 encoded Content-Disposition", () => {
    const header = "attachment; filename*=UTF-8''report%20final.pdf";
    const match = downloadSheetFilenameRegex.exec(header);
    expect(match?.[1]).toBe("report%20final.pdf");
  });

  it("extracts unquoted filename", () => {
    const header = "attachment; filename=report.pdf";
    const match = downloadSheetFilenameRegex.exec(header);
    expect(match?.[1]).toBe("report.pdf");
  });
});
