import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { SheetProvider, useSheet } from "./sheet-context.tsx";

describe("useSheet", () => {
  it("throws when used outside SheetProvider", () => {
    expect(() => renderHook(() => useSheet())).toThrow(
      "useSheet must be used within a SheetProvider"
    );
  });

  it("setSheetPath updates the sheetPath value", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SheetProvider>{children}</SheetProvider>
    );

    const { result } = renderHook(() => useSheet(), { wrapper });

    expect(result.current.sheetPath).toBeNull();

    act(() => {
      result.current.setSheetPath("/path/to/sheet");
    });

    expect(result.current.sheetPath).toBe("/path/to/sheet");
  });

  it("setSheetId updates the sheetId value", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SheetProvider>{children}</SheetProvider>
    );

    const { result } = renderHook(() => useSheet(), { wrapper });

    expect(result.current.sheetId).toBeNull();

    act(() => {
      result.current.setSheetId("sheet-123");
    });

    expect(result.current.sheetId).toBe("sheet-123");
  });
});
