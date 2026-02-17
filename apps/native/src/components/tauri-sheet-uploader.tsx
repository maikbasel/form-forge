import { Button } from "@repo/ui/components/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog.tsx";
import { useSheet } from "@repo/ui/context/sheet-context.tsx";
import { open } from "@tauri-apps/plugin-dialog";
import { Loader2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { uploadSheetFromPath } from "../lib/tauri-api-client";

const PATH_SEPARATOR_REGEX = /[\\/]/;

interface TauriSheetUploaderProps {
  onUploadSuccess?: (sheetId: string) => void;
}

export default function TauriSheetUploader({
  onUploadSuccess,
}: TauriSheetUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { setSheetPath, setSheetId } = useSheet();

  const handleBrowse = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: "PDF Files", extensions: ["pdf"] }],
    });

    if (!selected) {
      return;
    }

    const filePath = selected;
    const fileName = filePath.split(PATH_SEPARATOR_REGEX).pop() ?? "sheet.pdf";

    setIsProcessing(true);

    try {
      const result = await uploadSheetFromPath(filePath, fileName);
      setSheetPath(filePath);
      setSheetId(result.id);
      onUploadSuccess?.(result.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Import failed";
      toast.error(`Failed to import sheet: ${message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-lg border-2 border-dashed p-8">
        <div className="flex items-center justify-center rounded-full border p-2.5">
          <Upload className="size-6 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="font-medium text-sm">Import a PDF character sheet</p>
          <p className="text-muted-foreground text-xs">
            Select a PDF file from your computer
          </p>
        </div>
        <Button onClick={handleBrowse} size="sm" variant="outline">
          Browse Sheets
        </Button>
      </div>

      <Dialog open={isProcessing}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Processing Sheet</DialogTitle>
            <DialogDescription>
              Importing and extracting form fields from your PDF...
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-6">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
