import type { ApiClient, FileApiClient } from "@repo/ui/lib/api.ts";
import { createContext, type ReactNode, useContext } from "react";

const ApiClientContext = createContext<ApiClient | null>(null);

export function ApiClientProvider({
  client,
  children,
}: Readonly<{
  client: ApiClient;
  children: ReactNode;
}>) {
  return (
    <ApiClientContext.Provider value={client}>
      {children}
    </ApiClientContext.Provider>
  );
}

export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext);
  if (!client) {
    throw new Error("useApiClient must be used within ApiClientProvider");
  }
  return client;
}

export function useFileApiClient(): FileApiClient {
  const client = useContext(ApiClientContext);
  if (!(client && "uploadSheet" in client)) {
    throw new Error("useFileApiClient requires a FileApiClient in context");
  }
  return client as FileApiClient;
}
