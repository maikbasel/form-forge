import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import TauriSheetUploader from "../components/tauri-sheet-uploader";

export default function HomePage() {
  const { t } = useTranslation("sheets");
  const navigate = useNavigate();

  useEffect(() => {
    getCurrentWindow().setTitle("Form Forge").catch(console.error);
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-background">
      <div className="text-center">
        <p className="mt-2 text-muted-foreground">
          {t("native.uploadStarted")}
        </p>
      </div>
      <TauriSheetUploader
        onUploadSuccess={(sheetId) => navigate(`/sheets/${sheetId}`)}
      />
    </div>
  );
}
