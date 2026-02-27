"use client";

import { initI18n } from "@repo/i18n";
import type React from "react";
import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";

const i18n = initI18n("en");

export default function I18nProviderWrapper({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  useEffect(() => {
    const browserLang = navigator.language;
    if (browserLang && !i18n.language.startsWith(browserLang.split("-")[0])) {
      i18n.changeLanguage(browserLang);
    }
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
