import {
  type ApiErrorResponse,
  ApiErrorResponseSchema,
} from "@repo/api-spec/model";

/**
 * Parse unknown data as ApiErrorResponse with Zod validation
 */
export function parseApiError(data: unknown): ApiErrorResponse {
  const result = ApiErrorResponseSchema.safeParse(data);
  return result.success ? result.data : { message: "Unknown error" };
}

/**
 * Custom error class for API failures
 */
export class ApiClientError extends Error {
  statusCode: number;
  apiError: ApiErrorResponse;

  constructor(statusCode: number, apiError: ApiErrorResponse) {
    super(apiError.message);
    this.name = "ApiClientError";
    this.statusCode = statusCode;
    this.apiError = apiError;
  }

  static fromResponse(statusCode: number, message: string): ApiClientError {
    return new ApiClientError(statusCode, { message });
  }
}
