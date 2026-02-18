import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { ApiClient } from "../lib/api.ts";
import { ApiClientProvider, useApiClient } from "./api-client-context.tsx";

describe("useApiClient", () => {
  it("throws when used outside ApiClientProvider", () => {
    expect(() => renderHook(() => useApiClient())).toThrow(
      "useApiClient must be used within ApiClientProvider"
    );
  });

  it("returns the provided client when inside provider", () => {
    const mockClient: ApiClient = {
      getSheetFields: vi.fn(),
      attachAction: vi.fn(),
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
      <ApiClientProvider client={mockClient}>{children}</ApiClientProvider>
    );

    const { result } = renderHook(() => useApiClient(), { wrapper });
    expect(result.current).toBe(mockClient);
  });
});
