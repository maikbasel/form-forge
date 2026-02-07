import type { EndpointParameters, Method } from "./generated.ts";

export type FetcherResponse<T> =
  | { data: T; error?: undefined; response: Response }
  | { data?: undefined; error: unknown; response: Response };

/**
 * Create a type-safe API client for the given base URL
 * Returns a client with methods that match the openapi-fetch interface
 * @param baseUrl - Base URL for the API (e.g., "http://localhost:8081" or "/api")
 */
export function createApiClient(baseUrl: string) {
  const makeFetcher = () => {
    return async <T>(
      method: Method,
      path: string,
      parameters?: EndpointParameters
    ): Promise<FetcherResponse<T>> => {
      // Replace path parameters in URL
      let finalUrl = baseUrl + path;
      if (parameters?.path) {
        for (const [key, value] of Object.entries(parameters.path)) {
          finalUrl = finalUrl.replace(`{${key}}`, String(value));
        }
      }

      // Add query parameters
      if (parameters?.query) {
        const searchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(parameters.query)) {
          searchParams.append(key, String(value));
        }
        finalUrl += `?${searchParams.toString()}`;
      }

      const headers: Record<string, string> = {
        ...(parameters?.header as Record<string, string>),
      };

      let body: BodyInit | undefined;
      if (parameters?.body) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(parameters.body);
      }

      const response = await fetch(finalUrl, {
        method: method.toUpperCase(),
        headers,
        body,
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ message: "Unknown error" }));
        return { error, response, data: undefined };
      }

      // Handle empty responses (204 No Content)
      if (response.status === 204) {
        return { data: undefined as T, response, error: undefined };
      }

      const data = await response.json();
      return { data: data as T, response, error: undefined };
    };
  };

  const fetcher = makeFetcher();

  return {
    /**
     * GET request with params structure compatible with openapi-fetch
     */
    GET: <T>(
      path: string,
      options?: { params?: { path?: Record<string, string> } }
    ): Promise<FetcherResponse<T>> => {
      return fetcher<T>("get", path, { path: options?.params?.path });
    },

    /**
     * POST request with params and body
     */
    POST: <T>(
      path: string,
      options?: {
        params?: { path?: Record<string, string> };
        body?: unknown;
      }
    ): Promise<FetcherResponse<T>> => {
      return fetcher<T>("post", path, {
        path: options?.params?.path,
        body: options?.body,
      });
    },

    /**
     * PUT request with params and body
     */
    PUT: <T>(
      path: string,
      options?: {
        params?: { path?: Record<string, string> };
        body?: unknown;
      }
    ): Promise<FetcherResponse<T>> => {
      return fetcher<T>("put", path, {
        path: options?.params?.path,
        body: options?.body,
      });
    },
  };
}

// Re-export ApiClient for advanced use cases
export { ApiClient } from "./generated.ts";
