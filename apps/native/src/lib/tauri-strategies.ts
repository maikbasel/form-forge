import type {
  ExportStrategy,
  PdfLoadStrategy,
} from "@repo/ui/views/sheet-viewer";
import { downloadDir } from "@tauri-apps/api/path";
import { save } from "@tauri-apps/plugin-dialog";
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
  async export(sheetId: string): Promise<boolean> {
    const result = await exportSheet(sheetId);
    const lastDir = await getExportDir();
    const baseDir = lastDir ?? (await downloadDir());
    const defaultPath = `${baseDir}/${result.filename}`;

    const savePath = await save({
      defaultPath,
      filters: [{ name: "PDF Files", extensions: ["pdf"] }],
    });

    if (!savePath) {
      return false;
    }

    await copyFile(result.path, savePath);

    const chosenDir = savePath.substring(0, savePath.lastIndexOf("/"));
    setExportDir(chosenDir);
    return true;
  },
};
