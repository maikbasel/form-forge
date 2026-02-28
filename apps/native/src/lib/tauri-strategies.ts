import type {
  ExportStrategy,
  PdfLoadStrategy,
} from "@repo/ui/views/sheet-viewer";
import { dirname, downloadDir } from "@tauri-apps/api/path";
import { save } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import { getExportDir, setExportDir } from "./settings";
import { copyFile, exportSheet, readPdfBytes } from "./tauri-api-client";

export const tauriPdfLoader: PdfLoadStrategy = {
  async loadPdfUrl(filePath: string): Promise<string> {
    const buffer = await readPdfBytes(filePath);
    const blob = new Blob([buffer], { type: "application/pdf" });
    return URL.createObjectURL(blob);
  },
};

export const tauriExportStrategy: ExportStrategy = {
  async export(sheetId: string): Promise<string | null> {
    const result = await exportSheet(sheetId);
    const lastDir = await getExportDir();
    const baseDir = lastDir ?? (await downloadDir());
    const defaultPath = `${baseDir}/${result.filename}`;

    const savePath = await save({
      defaultPath,
      filters: [{ name: "PDF Files", extensions: ["pdf"] }],
    });

    if (!savePath) {
      return null;
    }

    await copyFile(result.path, savePath);

    const chosenDir = savePath.substring(0, savePath.lastIndexOf("/"));
    setExportDir(chosenDir);
    return savePath;
  },
  async revealInFolder(path: string): Promise<void> {
    const folder = await dirname(path);
    await openPath(folder);
  },
};
