"use client";

import { LanguageToggle } from "@repo/ui/components/language-toggle.tsx";
import { useTranslation } from "react-i18next";
import { ThemeToggle } from "./theme-toggle.tsx";

export function Header() {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-50 w-full border-border/40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4">
        {/* Logo/Brand - Left side */}
        <div className="flex items-center gap-6">
          <a className="flex items-center space-x-2" href="/">
            <span className="font-bold">{t("appName")}</span>
          </a>
          {/* Future navigation menu will go here */}
          <nav className="hidden items-center gap-6 text-sm md:flex">
            {/* Add navigation items here later */}
          </nav>
        </div>

        {/* Actions - Right side */}
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
