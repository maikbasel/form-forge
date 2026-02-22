import { describe, expect, it } from "vitest";
import { ApiClientError, parseApiError } from "./api.ts";

describe("parseApiError", () => {
  it("parses valid ProblemDetails shape", () => {
    expect(
      parseApiError({
        type: "/problems/not-found",
        title: "Not Found",
        status: 404,
        detail: "sheet not found",
      }),
    ).toEqual({
      type: "/problems/not-found",
      title: "Not Found",
      status: 404,
      detail: "sheet not found",
    });
  });

  it("parses minimal ProblemDetails (no detail)", () => {
    expect(
      parseApiError({
        type: "about:blank",
        title: "Internal Server Error",
        status: 500,
      }),
    ).toEqual({
      type: "about:blank",
      title: "Internal Server Error",
      status: 500,
    });
  });

  it("returns fallback for null", () => {
    expect(parseApiError(null)).toEqual({
      type: "about:blank",
      title: "Unknown Error",
      status: 0,
    });
  });

  it("returns fallback for a number", () => {
    expect(parseApiError(42)).toEqual({
      type: "about:blank",
      title: "Unknown Error",
      status: 0,
    });
  });

  it("returns fallback for wrong shape", () => {
    expect(parseApiError({ message: "bad" })).toEqual({
      type: "about:blank",
      title: "Unknown Error",
      status: 0,
    });
  });
});

describe("ApiClientError", () => {
  it("sets name, statusCode, problem, and inherits Error.message from detail", () => {
    const err = new ApiClientError(404, {
      type: "/problems/not-found",
      title: "Not Found",
      status: 404,
      detail: "sheet not found",
    });
    expect(err.name).toBe("ApiClientError");
    expect(err.statusCode).toBe(404);
    expect(err.problem.type).toBe("/problems/not-found");
    expect(err.message).toBe("sheet not found");
  });

  it("falls back to title when detail is absent", () => {
    const err = new ApiClientError(500, {
      type: "about:blank",
      title: "Internal Server Error",
      status: 500,
    });
    expect(err.message).toBe("Internal Server Error");
  });

  it("is instanceof Error", () => {
    const err = new ApiClientError(500, {
      type: "about:blank",
      title: "Internal Server Error",
      status: 500,
    });
    expect(err).toBeInstanceOf(Error);
  });

  it("fromResponse factory creates correct instance", () => {
    const err = ApiClientError.fromResponse(422, "Validation failed");
    expect(err).toBeInstanceOf(ApiClientError);
    expect(err.statusCode).toBe(422);
    expect(err.problem).toEqual({
      type: "about:blank",
      title: "Validation failed",
      status: 422,
    });
    expect(err.message).toBe("Validation failed");
  });
});
