import { Button } from "@repo/ui/components/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog.tsx";
import {
  FileUpload,
  FileUploadDropzone,
  type FileUploadProps,
  FileUploadTrigger,
} from "@repo/ui/components/file-upload.tsx";
import { Progress } from "@repo/ui/components/progress.tsx";
import { useFileApiClient } from "@repo/ui/context/api-client-context.tsx";
import { useSheet } from "@repo/ui/context/sheet-context.tsx";
import { ApiClientError } from "@repo/ui/types/api.ts";
import { Loader2, Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ["application/pdf"];

interface SheetUploaderProps {
  onUploadSuccess?: (sheetId: string) => void;
}

export default function SheetUploader({
  onUploadSuccess,
}: SheetUploaderProps = {}) {
  const { t } = useTranslation("sheets");
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const { setSheetPath, setSheetId } = useSheet();
  const apiClient = useFileApiClient();

  const getErrorMessage = useCallback(
    (error: unknown): string => {
      if (error instanceof ApiClientError) {
        return error.problem.detail ?? error.problem.title;
      }
      if (error instanceof Error) {
        return error.message;
      }
      return t("common:uploadFailed");
    },
    [t]
  );

  const uploadSingleFile = useCallback(
    async (options: {
      file: File;
      controller: AbortController;
      onProgress: (file: File, progress: number) => void;
      onSuccess: (file: File) => void;
      onError: (file: File, error: Error) => void;
    }) => {
      const { file, controller, onProgress, onSuccess, onError } = options;

      try {
        const result = await apiClient.uploadSheet(file, {
          signal: controller.signal,
          onProgress: (progress) => {
            setUploadProgress(progress);
            onProgress(file, progress);
          },
        });

        setSheetPath(result.location ?? null);
        setSheetId(result.id);

        // Make sure we end at 100% and mark success
        setUploadProgress(100);
        onProgress(file, 100);
        onSuccess(file);

        // Show the processing state before navigation
        setIsProcessing(true);

        // Call the success callback if provided
        onUploadSuccess?.(result.id);
      } catch (error) {
        setIsUploading(false);
        setUploadProgress(0);
        setAbortController(null);

        if (error instanceof Error && error.message === "Upload aborted") {
          toast.info(t("uploader.uploadCancelled"));
          return;
        }

        const errorMessage = getErrorMessage(error);
        onError(file, new Error(errorMessage));
      }
    },
    [apiClient, setSheetPath, setSheetId, onUploadSuccess, getErrorMessage, t]
  );

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

      const uploadPromises = filesToUpload.map((currentFile) =>
        uploadSingleFile({
          file: currentFile,
          controller,
          onProgress,
          onSuccess,
          onError,
        })
      );

      // Wait for all uploads to complete
      await Promise.all(uploadPromises);
      setIsUploading(false);
      setAbortController(null);
    },
    [uploadSingleFile]
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

  const onFileReject = useCallback(
    (file: File, message: string) => {
      toast(message, {
        description: t("uploader.fileRejected", {
          fileName:
            file.name.length > 20 ? `${file.name.slice(0, 20)}...` : file.name,
        }),
      });
    },
    [t]
  );

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
            <p className="font-medium text-sm">{t("uploader.dragAndDrop")}</p>
            <p className="text-muted-foreground text-xs">
              {t("uploader.orClickToBrowse")}
            </p>
          </div>
          <FileUploadTrigger asChild>
            <Button className="mt-2 w-fit" size="sm" variant="outline">
              {t("uploader.browseSheets")}
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
              {isProcessing
                ? t("uploader.processingSheet")
                : t("uploader.uploadingSheet")}
            </DialogTitle>
            <DialogDescription>
              {isProcessing
                ? t("uploader.extractingFormFields")
                : t("uploader.pleaseWaitUploading")}
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
