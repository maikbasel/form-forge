"use client";

import { createI18n } from "@repo/i18n";
import type React from "react";
import { useState } from "react";
import { I18nextProvider } from "react-i18next";

export default function I18nProviderWrapper({
  children,
  lng,
}: Readonly<{ children: React.ReactNode; lng: string }>) {
  // The server picks lng from Accept-Language, so the first render is already
  // in the right language and nothing has to switch after hydration.
  const [i18n] = useState(() => createI18n(lng));

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
