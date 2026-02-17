import type {
  DownloadStrategy,
  PdfLoadStrategy,
} from "@repo/ui/views/sheet-viewer.tsx";
import { convertFileSrc } from "@tauri-apps/api/core";
import { openPath } from "@tauri-apps/plugin-opener";
import { toast } from "sonner";
import { exportSheet } from "./tauri-api-client";

export const tauriPdfLoader: PdfLoadStrategy = {
  loadPdfUrl(filePath: string): string {
    return convertFileSrc(filePath);
  },
};

export const tauriDownloadStrategy: DownloadStrategy = {
  async download(sheetId: string): Promise<void> {
    const result = await exportSheet(sheetId);
    const dir = result.path.substring(0, result.path.lastIndexOf("/"));
    try {
      await openPath(dir);
    } catch {
      toast.info(`Exported to: ${result.path}`);
    }
  },
};
