import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientProvider } from "../context/api-client-context.tsx";
import { FieldSnippetProvider } from "../context/field-snippet-context.tsx";
import type { FileApiClient } from "../lib/api.ts";
import SheetViewer from "./sheet-viewer.tsx";

vi.mock("swr", () => ({
  default: () => ({
    data: [{ name: "STR" }, { name: "DEX" }, { name: "STRmod" }],
    error: undefined,
  }),
}));

const ABILITY_MODIFIER_REGEX = /Ability Modifier/;

const ABILITY_MODIFIER = {
  id: "ability-modifier",
  actionLabel: "AbilityModifier",
  roles: [
    { key: "abilityScoreFieldName", required: true, isTarget: false },
    { key: "abilityModifierFieldName", required: true, isTarget: true },
  ],
};

function createMockApiClient(
  overrides: Partial<FileApiClient> = {}
): FileApiClient {
  return {
    uploadSheet: vi.fn(),
    getSheetFields: vi.fn().mockResolvedValue([]),
    downloadSheet: vi.fn(),
    getActionTypes: vi.fn().mockResolvedValue([]),
    attachAction: vi.fn(),
    listAttachedActions: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function renderViewer(
  apiClient: FileApiClient,
  props: { file?: string; sheetId?: string } = {}
) {
  return render(
    <ApiClientProvider client={apiClient}>
      <FieldSnippetProvider>
        <SheetViewer {...props} />
      </FieldSnippetProvider>
    </ApiClientProvider>
  );
}

describe("SheetViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: "https://example.com/test.pdf" }),
    });
  });

  it("opens the calculation type list from New calculation", async () => {
    const user = userEvent.setup();
    const client = createMockApiClient({
      getActionTypes: vi.fn().mockResolvedValue([ABILITY_MODIFIER]),
    });
    renderViewer(client, { sheetId: "sheet-1" });

    await user.click(screen.getByRole("button", { name: "New calculation" }));
    await user.click(
      await screen.findByRole("button", { name: ABILITY_MODIFIER_REGEX })
    );

    expect(
      screen.getByText("Click the field on the sheet")
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("Click the Target Modifier field")
    ).not.toHaveLength(0);
    expect(
      screen.getByRole("button", { name: "Attach calculation" })
    ).toBeDisabled();
  });

  it("export button calls apiClient.downloadSheet and shows success toast", async () => {
    const user = userEvent.setup();
    const blob = new Blob(["pdf"], { type: "application/pdf" });
    const client = createMockApiClient({
      downloadSheet: vi.fn().mockResolvedValue({ blob, filename: "sheet.pdf" }),
    });

    // Mock URL.createObjectURL and revokeObjectURL
    vi.spyOn(globalThis.URL, "createObjectURL").mockReturnValue(
      "blob:http://localhost/test"
    );
    vi.spyOn(globalThis.URL, "revokeObjectURL").mockImplementation(
      () => undefined
    );

    // Mock the anchor element that triggerBrowserDownload creates
    const originalCreateElement = document.createElement.bind(document);
    const mockClick = vi.fn();
    const mockRemove = vi.fn();
    vi.spyOn(document, "createElement").mockImplementation(
      (tagName: string, options?: ElementCreationOptions) => {
        const el = originalCreateElement(tagName, options);
        if (tagName === "a") {
          el.click = mockClick;
          el.remove = mockRemove;
        }
        return el;
      }
    );

    renderViewer(client, { sheetId: "sheet-1" });

    const exportButton = screen.getByText("Export");
    await user.click(exportButton);

    await waitFor(() => {
      expect(client.downloadSheet).toHaveBeenCalledWith("sheet-1");
      expect(toast.success).toHaveBeenCalledWith(
        "Sheet exported successfully",
        expect.objectContaining({
          description: expect.stringContaining("Adobe Acrobat Reader"),
        })
      );
    });

    vi.restoreAllMocks();
  });

  it("renders the page navigation controls", () => {
    const client = createMockApiClient();
    renderViewer(client, { sheetId: "sheet-1" });

    expect(screen.getByText("Previous")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
  });
});
