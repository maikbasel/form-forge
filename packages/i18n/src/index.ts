import i18next, { type i18n as I18n, type InitOptions } from "i18next";
import { initReactI18next } from "react-i18next";
import { resources } from "./resources";

const options: InitOptions = {
  resources,
  fallbackLng: "en",
  defaultNS: "common",
  ns: ["common", "sheets", "actions"],
  interpolation: {
    escapeValue: false,
  },
  // Resources are bundled, so init can finish before the first render.
  initAsync: false,
};

// Keep <html lang> in sync so screen readers and hyphenation use the UI language.
function syncDocumentLanguage(instance: I18n) {
  if (typeof document === "undefined") {
    return;
  }
  const sync = (language: string) => {
    document.documentElement.lang = language.split("-")[0] ?? "en";
  };
  sync(instance.language ?? "en");
  instance.on("languageChanged", sync);
}

/** The shared instance, for apps that pick the language before rendering. */
export function initI18n(lng?: string) {
  if (i18next.isInitialized) {
    return i18next;
  }
  i18next.use(initReactI18next).init({ ...options, lng: lng ?? "en" });
  syncDocumentLanguage(i18next);
  return i18next;
}

/**
 * A separate instance per call. Server rendering needs one per request, so
 * concurrent requests in different languages don't share state.
 */
export function createI18n(lng: string): I18n {
  const instance = i18next.createInstance();
  instance.use(initReactI18next).init({ ...options, lng });
  syncDocumentLanguage(instance);
  return instance;
}
