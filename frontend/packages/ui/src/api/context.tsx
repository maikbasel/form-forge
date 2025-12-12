import { createContext, useContext, type ReactNode } from "react";
import type { ApiClient } from "./client.js";

const ApiClientContext = createContext<ApiClient | null>(null);

export type ApiClientProviderProps = {
  client: ApiClient;
  children: ReactNode;
};

/**
 * Provider component that injects the API client implementation into the React tree.
 *
 * Different apps provide different implementations:
 * - Web app: Provides ServerApiClient (uses Next.js Server Actions)
 * - Native app: Provides ClientApiClient (uses direct fetch)
 *
 * @example
 * ```tsx
 * // In web app
 * <ApiClientProvider client={serverApiClient}>
 *   <App />
 * </ApiClientProvider>
 *
 * // In native app
 * <ApiClientProvider client={clientApiClient}>
 *   <App />
 * </ApiClientProvider>
 * ```
 */
export function ApiClientProvider({
  client,
  children,
}: ApiClientProviderProps) {
  return (
    <ApiClientContext.Provider value={client}>
      {children}
    </ApiClientContext.Provider>
  );
}

/**
 * Hook to access the injected API client.
 *
 * Must be used within an ApiClientProvider.
 *
 * @throws Error if used outside of ApiClientProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const apiClient = useApiClient();
 *
 *   const handleUpload = async (file: File) => {
 *     const result = await apiClient.uploadSheet(file);
 *     console.log('Uploaded:', result.id);
 *   };
 *
 *   return <button onClick={() => handleUpload(file)}>Upload</button>;
 * }
 * ```
 */
export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext);
  if (!client) {
    throw new Error("useApiClient must be used within ApiClientProvider");
  }
  return client;
}