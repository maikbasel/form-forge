import { describe, expect, it } from "vitest";
import { ApiClientError, parseApiError } from "./api.ts";

describe("parseApiError", () => {
  it("parses valid { message: '...' } shape", () => {
    expect(parseApiError({ message: "Not found" })).toEqual({
      message: "Not found",
    });
  });

  it('returns { message: "Unknown error" } for null', () => {
    expect(parseApiError(null)).toEqual({ message: "Unknown error" });
  });

  it('returns { message: "Unknown error" } for a number', () => {
    expect(parseApiError(42)).toEqual({ message: "Unknown error" });
  });

  it('returns { message: "Unknown error" } for wrong shape', () => {
    expect(parseApiError({ error: "bad" })).toEqual({
      message: "Unknown error",
    });
  });
});

describe("ApiClientError", () => {
  it("sets name, statusCode, apiError, and inherits Error.message", () => {
    const err = new ApiClientError(404, { message: "Not found" });
    expect(err.name).toBe("ApiClientError");
    expect(err.statusCode).toBe(404);
    expect(err.apiError).toEqual({ message: "Not found" });
    expect(err.message).toBe("Not found");
  });

  it("is instanceof Error", () => {
    const err = new ApiClientError(500, { message: "Server error" });
    expect(err).toBeInstanceOf(Error);
  });

  it("fromResponse factory creates correct instance", () => {
    const err = ApiClientError.fromResponse(422, "Validation failed");
    expect(err).toBeInstanceOf(ApiClientError);
    expect(err.statusCode).toBe(422);
    expect(err.apiError).toEqual({ message: "Validation failed" });
    expect(err.message).toBe("Validation failed");
  });
});
