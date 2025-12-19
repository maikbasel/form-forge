import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import {
  FileUpload,
  FileUploadDropzone,
  type FileUploadProps,
  FileUploadTrigger,
} from "@repo/ui/components/file-upload";
import { Progress } from "@repo/ui/components/progress";
import { useApiClient } from "@repo/ui/context/api-client-context";
import { useSheet } from "@repo/ui/context/sheet-context";
import { ApiClientError } from "@repo/ui/types/api.js";
import { Loader2, Upload } from "lucide-react";
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
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const { setSheetPath, setSheetId } = useSheet();
  const apiClient = useApiClient();

  const onUpload: NonNullable<FileUploadProps["onUpload"]> = useCallback(
    async (filesToUpload, { onProgress, onSuccess, onError }) => {
      const file = filesToUpload[0];
      if (!file) {
        throw new Error("No file selected");
      }

      setIsUploading(true);
      setUploadProgress(0);

      const controller = new AbortController();
      setAbortController(controller);

      const uploadPromises = filesToUpload.map(async (currentFile) => {
        try {
          const result = await apiClient.uploadSheet(currentFile, {
            signal: controller.signal,
            onProgress: (progress) => {
              setUploadProgress(progress);
              onProgress(currentFile, progress);
            },
          });

          setSheetPath(result.location);
          setSheetId(result.id);

          // Make sure we end at 100% and mark success
          setUploadProgress(100);
          onProgress(currentFile, 100);
          onSuccess(currentFile);

          // Show the processing state before navigation
          setIsProcessing(true);

          // Call the success callback if provided
          onUploadSuccess?.(result.id);
        } catch (error) {
          setIsUploading(false);
          setUploadProgress(0);
          setAbortController(null);

          if (error instanceof Error && error.message === "Upload aborted") {
            toast.info("Upload cancelled");
            return;
          }

          const errorMessage =
            error instanceof ApiClientError
              ? error.apiError.message
              : error instanceof Error
                ? error.message
                : "Upload failed";

          onError(currentFile, new Error(errorMessage));
        }
      });

      // Wait for all uploads to complete
      await Promise.all(uploadPromises);
      setIsUploading(false);
      setAbortController(null);
    },
    [setSheetPath, setSheetId, onUploadSuccess, apiClient]
  );

  const handleCancelUpload = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setIsUploading(false);
      setIsProcessing(false);
      setUploadProgress(0);
      setFiles([]);
      setAbortController(null);
    }
  }, [abortController]);

  const onFileReject = useCallback((file: File, message: string) => {
    toast(message, {
      description: `"${file.name.length > 20 ? `${file.name.slice(0, 20)}...` : file.name}" has been rejected`,
    });
  }, []);

  return (
    <>
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
            <p className="font-medium text-sm">
              Drag & drop your PDF Sheet here
            </p>
            <p className="text-muted-foreground text-xs">Or click to browse</p>
          </div>
          <FileUploadTrigger asChild>
            <Button className="mt-2 w-fit" size="sm" variant="outline">
              Browse sheets
            </Button>
          </FileUploadTrigger>
        </FileUploadDropzone>
      </FileUpload>

      <Dialog
        onOpenChange={handleCancelUpload}
        open={isUploading || isProcessing}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isProcessing ? "Processing Sheet" : "Uploading Sheet"}
            </DialogTitle>
            <DialogDescription>
              {isProcessing
                ? "Extracting form fields from your PDF..."
                : "Please wait while we upload your PDF sheet"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-6">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            {!isProcessing && (
              <div className="w-full space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-center text-muted-foreground text-sm">
                  {Math.round(uploadProgress)}%
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
