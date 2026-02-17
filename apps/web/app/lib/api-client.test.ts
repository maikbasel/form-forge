import { AxiosError, type AxiosResponse } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@repo/ui/types/api.ts";

// Mock axios
vi.mock("axios", async () => {
  const { AxiosError } = await vi.importActual<typeof import("axios")>(
    "axios"
  );
  return {
    default: {
      post: vi.fn(),
      isAxiosError: (err: unknown) => err instanceof AxiosError,
    },
    AxiosError,
  };
});

// Mock server action
vi.mock("./actions.ts", () => ({
  getSheetFields: vi.fn().mockResolvedValue([]),
}));

// Must import after mocks are set up
const axios = (await import("axios")).default;

describe("apiClient", () => {
  let apiClient: typeof import("./api-client.ts")["apiClient"];

  beforeEach(async () => {
    vi.clearAllMocks();
    // Fresh import each time to reset module state
    const mod = await import("./api-client.ts");
    apiClient = mod.apiClient;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("uploadSheet", () => {
    it("sends FormData and returns { id, location }", async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { id: "sheet-123" },
        headers: { location: "/sheets/sheet-123" },
        status: 201,
      });

      const file = new File(["content"], "test.pdf", {
        type: "application/pdf",
      });
      const result = await apiClient.uploadSheet(file);

      expect(axios.post).toHaveBeenCalledWith(
        "/api/sheets",
        expect.any(FormData),
        expect.objectContaining({
          headers: { "Content-Type": "multipart/form-data" },
        })
      );
      expect(result).toEqual({ id: "sheet-123", location: "/sheets/sheet-123" });
    });

    it("throws ApiClientError on missing Location header", async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { id: "sheet-123" },
        headers: {},
        status: 201,
      });

      const file = new File(["content"], "test.pdf", {
        type: "application/pdf",
      });

      await expect(apiClient.uploadSheet(file)).rejects.toThrow(
        "Missing Location header in response"
      );
    });
  });

  describe("downloadSheet", () => {
    it("performs two-step fetch (pre-signed URL -> S3 blob)", async () => {
      const blob = new Blob(["pdf"], { type: "application/pdf" });

      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              url: "https://s3.example.com/sheet.pdf",
              filename: "sheet.pdf",
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          blob: () => Promise.resolve(blob),
        });

      const result = await apiClient.downloadSheet("sheet-123");

      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
      expect(globalThis.fetch).toHaveBeenNthCalledWith(
        1,
        "/api/sheets/sheet-123",
        { method: "GET" }
      );
      expect(globalThis.fetch).toHaveBeenNthCalledWith(
        2,
        "https://s3.example.com/sheet.pdf"
      );
      expect(result).toEqual({ blob, filename: "sheet.pdf" });
    });

    it("throws on first step failing", async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: "Sheet not found" }),
      });

      await expect(apiClient.downloadSheet("bad-id")).rejects.toThrow(
        ApiClientError
      );
    });

    it("throws on second step (S3 download) failing", async () => {
      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              url: "https://s3.example.com/sheet.pdf",
              filename: "sheet.pdf",
            }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          statusText: "Forbidden",
        });

      await expect(apiClient.downloadSheet("sheet-123")).rejects.toThrow(
        ApiClientError
      );
    });
  });

  describe("attachAction", () => {
    it("sends PUT with JSON body to correct endpoint", async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
      });

      await apiClient.attachAction("sheet-123", {
        type: "ability-modifier",
        mapping: {
          abilityScoreFieldName: "STR",
          abilityModifierFieldName: "STRmod",
        },
      });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/dnd5e/sheet-123/ability-modifier",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            abilityScoreFieldName: "STR",
            abilityModifierFieldName: "STRmod",
          }),
        }
      );
    });

    it("throws on non-OK response", async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: "Bad request" }),
      });

      await expect(
        apiClient.attachAction("sheet-123", {
          type: "ability-modifier",
          mapping: {
            abilityScoreFieldName: "STR",
            abilityModifierFieldName: "STRmod",
          },
        })
      ).rejects.toThrow(ApiClientError);
    });
  });
});
