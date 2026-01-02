import { z } from "zod";

export const UploadSheetResponseSchema = z.object({
  id: z.string().uuid(),
});

export type UploadSheetResponse = z.infer<typeof UploadSheetResponseSchema>;

export interface UploadSheetResult {
  id: string;
  location: string;
}

export interface DownloadSheetResult {
  blob: Blob;
  filename: string;
}

export type UploadProgressCallback = (progress: number) => void;

export interface UploadOptions {
  signal?: AbortSignal;
  onProgress?: UploadProgressCallback;
}

export const FormFieldSchema = z.object({
  name: z.string(),
});

export type FormField = z.infer<typeof FormFieldSchema>;

export const ListSheetFieldsResponseSchema = z.object({
  fields: z.array(FormFieldSchema),
});

export type ListSheetFieldsResponse = z.infer<
  typeof ListSheetFieldsResponseSchema
>;
