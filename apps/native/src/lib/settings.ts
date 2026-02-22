import { LazyStore } from "@tauri-apps/plugin-store";

const store = new LazyStore("settings.json");

export type Theme = "light" | "dark" | "system";

export async function getTheme(): Promise<Theme> {
  const stored = await store.get<Theme>("theme");
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

export async function setTheme(theme: Theme): Promise<void> {
  await store.set("theme", theme);
}

export async function getExportDir(): Promise<string | null> {
  return (await store.get<string>("exportDir")) ?? null;
}

export async function setExportDir(dir: string | null): Promise<void> {
  if (dir === null) {
    await store.delete("exportDir");
  } else {
    await store.set("exportDir", dir);
  }
}
