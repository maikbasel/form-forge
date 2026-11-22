// No React imports: server components import this.
export const SUPPORTED_LANGUAGES = ["en", "de"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Picks the first supported language from an Accept-Language header or a
 * comma-separated list such as navigator.languages, falling back to English.
 */
export function pickLanguage(preferred: string | null | undefined): Language {
  for (const entry of (preferred ?? "").split(",")) {
    const prefix = entry.split(";")[0]?.trim().split("-")[0]?.toLowerCase();
    const match = SUPPORTED_LANGUAGES.find((lang) => lang === prefix);
    if (match) {
      return match;
    }
  }
  return "en";
}
