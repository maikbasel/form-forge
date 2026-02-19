const THEME_KEY = "ff:theme";
const EXPORT_DIR_KEY = "ff:export-dir";

export type Theme = "light" | "dark" | "system";

export function getTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(THEME_KEY, theme);
}

export function getExportDir(): string | null {
  return localStorage.getItem(EXPORT_DIR_KEY);
}

export function setExportDir(dir: string | null): void {
  if (dir === null) {
    localStorage.removeItem(EXPORT_DIR_KEY);
  } else {
    localStorage.setItem(EXPORT_DIR_KEY, dir);
  }
}
