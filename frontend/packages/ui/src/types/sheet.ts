import { z } from "zod";

export const UploadSheetResponseSchema = z.object({
  id: z.string().uuid(),
});

export type UploadSheetResponse = z.infer<typeof UploadSheetResponseSchema>;

export type UploadSheetResult = {
  id: string;
  location: string;
};

export type UploadProgressCallback = (progress: number) => void;

export type UploadOptions = {
  signal?: AbortSignal;
  onProgress?: UploadProgressCallback;
};

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
