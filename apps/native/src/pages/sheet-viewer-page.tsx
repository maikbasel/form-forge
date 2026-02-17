import { Button } from "@repo/ui/components/button.tsx";
import { useSheet } from "@repo/ui/context/sheet-context.tsx";
import SheetViewer from "@repo/ui/views/sheet-viewer.tsx";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { tauriDownloadStrategy, tauriPdfLoader } from "../lib/tauri-strategies";

export default function SheetViewerPage() {
  const { id } = useParams<{ id: string }>();
  const { sheetPath } = useSheet();

  if (!id) {
    return null;
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="flex items-center gap-4 border-b px-6 py-3">
        <Button asChild size="sm" variant="outline">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Upload New Sheet
          </Link>
        </Button>
      </div>
      <div className="flex-1 overflow-hidden">
        <SheetViewer
          downloadHandler={tauriDownloadStrategy}
          file={sheetPath ?? undefined}
          pdfLoader={tauriPdfLoader}
          sheetId={id}
        />
      </div>
    </div>
  );
}
