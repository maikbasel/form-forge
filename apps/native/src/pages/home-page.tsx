import { useNavigate } from "react-router-dom";
import TauriSheetUploader from "../components/tauri-sheet-uploader";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 bg-background">
      <div className="text-center">
        <h1 className="font-bold text-3xl tracking-tight">Form Forge</h1>
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
