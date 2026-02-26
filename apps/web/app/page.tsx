"use client";

import SheetUploader from "@repo/ui/views/sheet-uploader.tsx";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

export default function Home() {
  const { t } = useTranslation("sheets");
  const router = useRouter();

  const handleUploadSuccess = useCallback(
    (sheetId: string) => {
      router.push(`/sheets/${sheetId}`);
    },
    [router]
  );

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="font-bold text-3xl tracking-tight">
            {t("web.uploadTitle")}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {t("web.uploadDescription")}
          </p>
        </div>
        <SheetUploader onUploadSuccess={handleUploadSuccess} />
      </div>
    </div>
  );
}
