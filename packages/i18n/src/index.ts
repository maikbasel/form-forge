import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { resources } from "./resources";

export function initI18n(lng?: string) {
  if (i18next.isInitialized) {
    return i18next;
  }

  i18next.use(initReactI18next).init({
    resources,
    lng: lng ?? "en",
    fallbackLng: "en",
    defaultNS: "common",
    ns: ["common", "sheets", "actions"],
    interpolation: {
      escapeValue: false,
    },
  });

  // Keep <html lang> in sync so screen readers and hyphenation use the UI language.
  if (typeof document !== "undefined") {
    const syncDocumentLanguage = (language: string) => {
      document.documentElement.lang = language.split("-")[0] ?? "en";
    };
    syncDocumentLanguage(i18next.language ?? lng ?? "en");
    i18next.on("languageChanged", syncDocumentLanguage);
  }

  return i18next;
}
