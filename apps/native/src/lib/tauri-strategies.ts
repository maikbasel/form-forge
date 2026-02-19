import type {
  DownloadStrategy,
  PdfLoadStrategy,
} from "@repo/ui/views/sheet-viewer";
import { openPath } from "@tauri-apps/plugin-opener";
import { toast } from "sonner";
import { getExportDir } from "./settings";
import { copyFileToDir, exportSheet, readPdfBytes } from "./tauri-api-client";

export const tauriPdfLoader: PdfLoadStrategy = {
  async loadPdfUrl(filePath: string): Promise<string> {
    const buffer = await readPdfBytes(filePath);
    const blob = new Blob([buffer], { type: "application/pdf" });
    return URL.createObjectURL(blob);
  },
};

export const tauriDownloadStrategy: DownloadStrategy = {
  async download(sheetId: string): Promise<void> {
    const result = await exportSheet(sheetId);
    const customDir = getExportDir();

    if (customDir) {
      try {
        await copyFileToDir(result.path, customDir, result.filename);
        await openPath(customDir);
      } catch {
        toast.info(`Exported to: ${result.path}`);
      }
    } else {
      const dir = result.path.substring(0, result.path.lastIndexOf("/"));
      try {
        await openPath(dir);
      } catch {
        toast.info(`Exported to: ${result.path}`);
      }
    }
  },
};
