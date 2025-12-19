import { z } from "zod";

export const ApiErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

/**
 * Custom error class for API failures
 */
export class ApiClientError extends Error {
  statusCode: number;
  apiError: ApiError;

  constructor(statusCode: number, apiError: ApiError) {
    super(apiError.message);
    this.name = "ApiClientError";
    this.statusCode = statusCode;
    this.apiError = apiError;
  }

  static fromResponse(statusCode: number, message: string): ApiClientError {
    return new ApiClientError(statusCode, { message });
  }
}
