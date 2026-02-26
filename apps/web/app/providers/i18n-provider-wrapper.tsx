"use client";

import { initI18n } from "@repo/i18n";
import type React from "react";
import { I18nextProvider } from "react-i18next";

const i18n = initI18n(
  typeof navigator !== "undefined" ? navigator.language : "en"
);

export default function I18nProviderWrapper({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
