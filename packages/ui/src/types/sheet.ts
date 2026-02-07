// Custom types not generated from OpenAPI spec

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
