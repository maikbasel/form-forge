import { describe, expect, it, vi } from "vitest";

vi.mock("swr", () => ({
  mutate: vi.fn(),
}));

import { getSheetFieldsCacheKey } from "./cache.ts";

describe("getSheetFieldsCacheKey", () => {
  it('returns "sheet-fields-abc" for id "abc"', () => {
    expect(getSheetFieldsCacheKey("abc")).toBe("sheet-fields-abc");
  });
});
