import {
  type ProblemDetails,
  ProblemDetailsSchema,
} from "@repo/api-spec/model";

/**
 * Parse unknown data as ProblemDetails with Zod validation
 */
export function parseApiError(data: unknown): ProblemDetails {
  const result = ProblemDetailsSchema.safeParse(data);
  return result.success
    ? result.data
    : { type: "about:blank", title: "Unknown Error", status: 0 };
}

/**
 * Custom error class for API failures
 */
export class ApiClientError extends Error {
  statusCode: number;
  problem: ProblemDetails;

  constructor(statusCode: number, problem: ProblemDetails) {
    super(problem.detail ?? problem.title);
    this.name = "ApiClientError";
    this.statusCode = statusCode;
    this.problem = problem;
  }

  static fromResponse(statusCode: number, message: string): ApiClientError {
    return new ApiClientError(statusCode, {
      type: "about:blank",
      title: message,
      status: statusCode,
    });
  }
}
