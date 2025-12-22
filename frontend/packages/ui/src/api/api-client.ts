import type { AttachActionRequest } from "@repo/ui/types/action";
import type {
  DownloadSheetResult,
  FormField,
  UploadOptions,
  UploadSheetResult,
} from "@repo/ui/types/sheet";

export type ApiClient = {
  uploadSheet(file: File, options?: UploadOptions): Promise<UploadSheetResult>;
  getSheetFields(sheetId: string): Promise<FormField[]>;
  downloadSheet(sheetId: string): Promise<DownloadSheetResult>;
  applyAction(sheetId: string, action: AttachActionRequest): Promise<void>;
};
