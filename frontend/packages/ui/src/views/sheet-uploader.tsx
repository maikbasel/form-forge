import { Button } from "@repo/ui/components/button";
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadItemProgress,
  FileUploadList,
  type FileUploadProps,
  FileUploadTrigger,
} from "@repo/ui/components/file-upload";
import { useSheet } from "@repo/ui/context/sheet-context";
import axios from "axios";
import { Upload, X } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ["application/pdf"];

export default function SheetUploader() {
  const [files, setFiles] = useState<File[]>([]);
  const { setSheetPath, setSheetId } = useSheet();

  const onUpload: NonNullable<FileUploadProps["onUpload"]> = useCallback(
    async (files, { onProgress, onSuccess, onError }) => {
      const file = files[0];
      if (!file) {
        throw new Error("No file selected");
      }

      const formData = new FormData();
      formData.append("sheet", file);

      const uploadPromises = files.map(async (file) => {
        try {
          // TODO: Generate client from OpenAPI spec.
          const response = await axios.post(
            "http://localhost:8081/sheets",
            formData,
            {
              headers: { "Content-Type": "multipart/form-data" },
              onUploadProgress: (event) => {
                if (!event.total) {
                  return;
                }
                const progress = (event.loaded / event.total) * 100;
                onProgress(file, progress);
              },
            }
          );

          const location = response.headers.location;
          if (!location) {
            // noinspection ExceptionCaughtLocallyJS
            throw new Error("Location header is missing");
          }

          setSheetPath(location);
          setSheetId(location.split("/").pop());

          // Make sure we end at 100% and mark success
          onProgress(file, 100);
          onSuccess(file);
        } catch (error) {
          onError(
            file,
            error instanceof Error ? error : new Error("Upload failed")
          );
        }
      });

      // Wait for all uploads to complete
      await Promise.all(uploadPromises);
    },
    [setSheetPath]
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
          <p className="font-medium text-sm">Drag & drop files here</p>
          <p className="text-muted-foreground text-xs">
            Or click to browse (max 2 files)
          </p>
        </div>
        <FileUploadTrigger asChild>
          <Button className="mt-2 w-fit" size="sm" variant="outline">
            Browse files
          </Button>
        </FileUploadTrigger>
      </FileUploadDropzone>
      <FileUploadList>
        {files.map((file, index) => (
          <FileUploadItem className="flex-col" key={index} value={file}>
            <div className="flex w-full items-center gap-2">
              <FileUploadItemPreview />
              <FileUploadItemMetadata />
              <FileUploadItemDelete asChild>
                <Button className="size-7" size="icon" variant="ghost">
                  <X />
                </Button>
              </FileUploadItemDelete>
            </div>
            <FileUploadItemProgress />
          </FileUploadItem>
        ))}
      </FileUploadList>
    </FileUpload>
  );
}
