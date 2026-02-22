import { Button } from "@repo/ui/components/button.tsx";
import { useSheet } from "@repo/ui/context/sheet-context";
import SheetViewer from "@repo/ui/views/sheet-viewer";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { listSheets } from "../lib/tauri-api-client";
import { tauriExportStrategy, tauriPdfLoader } from "../lib/tauri-strategies";

export default function SheetViewerPage() {
  const { id } = useParams<{ id: string }>();
  const { sheetPath } = useSheet();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) {
      return;
    }
    listSheets()
      .then((sheets) => {
        const found = sheets.find((s) => s.id === id);
        const title = found
          ? `${found.originalName} – Form Forge`
          : "Form Forge";
        return getCurrentWindow().setTitle(title);
      })
      .catch(console.error);
  }, [id]);

  if (!id) {
    return null;
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center border-b px-2 py-1.5">
        <Button onClick={() => navigate("/")} size="sm" variant="ghost">
          <ArrowLeft className="size-4" />
          Back
        </Button>
      </header>
      <div className="flex-1 overflow-hidden">
        <SheetViewer
          exportHandler={tauriExportStrategy}
          file={sheetPath ?? undefined}
          pdfLoader={tauriPdfLoader}
          sheetId={id}
        />
      </div>
    </div>
  );
}
