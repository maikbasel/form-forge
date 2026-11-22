"use client";

import { Button } from "@repo/ui/components/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu.tsx";
import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "en", nameKey: "language.en" },
  { code: "de", nameKey: "language.de" },
] as const;

export function LanguageToggle() {
  const { t, i18n } = useTranslation();
  // i18n.language can be a region variant such as "de-DE"
  const current =
    LANGUAGES.find((lang) => i18n.language.startsWith(lang.code))?.code ?? "en";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost">
          <Languages className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">{t("language.toggle")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          onValueChange={(code) => i18n.changeLanguage(code)}
          value={current}
        >
          {LANGUAGES.map((lang) => (
            <DropdownMenuRadioItem key={lang.code} value={lang.code}>
              {t(lang.nameKey)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
