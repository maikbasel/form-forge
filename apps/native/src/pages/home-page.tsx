import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TauriSheetUploader from "../components/tauri-sheet-uploader";

export default function HomePage() {
  const navigate = useNavigate();

  useEffect(() => {
    getCurrentWindow().setTitle("Form Forge").catch(console.error);
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-background">
      <div className="text-center">
        <p className="mt-2 text-muted-foreground">
          Upload a PDF character sheet to get started
        </p>
      </div>
      <TauriSheetUploader
        onUploadSuccess={(sheetId) => navigate(`/sheets/${sheetId}`)}
      />
    </div>
  );
}
