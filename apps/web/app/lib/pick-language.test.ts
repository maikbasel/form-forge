import { describe, expect, it } from "vitest";
import { pickLanguage } from "@repo/i18n/languages";

describe("pickLanguage", () => {
  it.each([
    ["de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7", "de"],
    ["fr-FR,fr;q=0.9,de;q=0.8", "de"],
    ["en-US,en;q=0.9", "en"],
    ["fr-FR", "en"],
    ["", "en"],
    [null, "en"],
  ])("picks %s as %s", (header, expected) => {
    expect(pickLanguage(header)).toBe(expected);
  });
});
