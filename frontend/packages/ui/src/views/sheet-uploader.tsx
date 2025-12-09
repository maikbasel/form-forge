import { Button } from "@repo/ui/components/button";
import {
  FileUpload,
  FileUploadDropzone,
  type FileUploadProps,
  FileUploadTrigger,
} from "@repo/ui/components/file-upload";
import { useSheet } from "@repo/ui/context/sheet-context";
import { API_BASE_URL } from "@repo/ui/lib/api";
import axios from "axios";
import { Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ["application/pdf"];

type SheetUploaderProps = {
  onUploadSuccess?: (sheetId: string) => void;
};

export default function SheetUploader({
  onUploadSuccess,
}: SheetUploaderProps = {}) {
  const [files, setFiles] = useState<File[]>([]);
  const { setSheetPath, setSheetId } = useSheet();

  const onUpload: NonNullable<FileUploadProps["onUpload"]> = useCallback(
    async (filesToUpload, { onProgress, onSuccess, onError }) => {
      const file = filesToUpload[0];
      if (!file) {
        throw new Error("No file selected");
      }

      const formData = new FormData();
      formData.append("sheet", file);

      const uploadPromises = filesToUpload.map(async (currentFile) => {
        try {
          // TODO: Generate client from OpenAPI spec.
          const response = await axios.post(
            `${API_BASE_URL}/sheets`,
            formData,
            {
              headers: { "Content-Type": "multipart/form-data" },
              onUploadProgress: (event) => {
                if (!event.total) {
                  return;
                }
                const progress = (event.loaded / event.total) * 100;
                onProgress(currentFile, progress);
              },
            }
          );

          const location = response.headers.location;
          if (!location) {
            // noinspection ExceptionCaughtLocallyJS
            throw new Error("Location header is missing");
          }

          const extractedSheetId = location.split("/").pop();
          if (!extractedSheetId) {
            // noinspection ExceptionCaughtLocallyJS
            throw new Error("Failed to extract sheet ID from location");
          }

          setSheetPath(location);
          setSheetId(extractedSheetId);

          // Make sure we end at 100% and mark success
          onProgress(currentFile, 100);
          onSuccess(currentFile);

          // Call the success callback if provided
          onUploadSuccess?.(extractedSheetId);
        } catch (error) {
          onError(
            currentFile,
            error instanceof Error ? error : new Error("Upload failed")
          );
        }
      });

      // Wait for all uploads to complete
      await Promise.all(uploadPromises);
    },
    [setSheetPath, setSheetId, onUploadSuccess]
  );

  const onFileReject = useCallback((file: File, message: string) => {
    toast(message, {
      description: `"${file.name.length > 20 ? `${file.name.slice(0, 20)}...` : file.name}" has been rejected`,
    });
  }, []);

  return (
    <FileUpload
      accept={ALLOWED_FILE_TYPES.join(",")}
      className="w-full max-w-md"
      maxFiles={1}
      maxSize={MAX_FILE_SIZE}
      onFileReject={onFileReject}
      onUpload={onUpload}
      onValueChange={setFiles}
      value={files}
    >
      <FileUploadDropzone>
        <div className="flex flex-col items-center gap-1 text-center">
          <div className="flex items-center justify-center rounded-full border p-2.5">
            <Upload className="size-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-sm">Drag & drop your PDF Sheet here</p>
          <p className="text-muted-foreground text-xs">Or click to browse</p>
        </div>
        <FileUploadTrigger asChild>
          <Button className="mt-2 w-fit" size="sm" variant="outline">
            Browse sheets
          </Button>
        </FileUploadTrigger>
      </FileUploadDropzone>
    </FileUpload>
  );
}
