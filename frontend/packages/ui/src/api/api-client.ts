import type {AppliedAction, FormField, UploadOptions, UploadSheetResult} from "@repo/ui/types/types";


export type ApiClient = {
    uploadSheet(file: File, options?: UploadOptions): Promise<UploadSheetResult>;
    getSheetFields(sheetId: string): Promise<FormField[]>;
    downloadSheet(sheetId: string): Promise<Blob>;
    applyAction(sheetId: string, action: AppliedAction): Promise<void>;
};
