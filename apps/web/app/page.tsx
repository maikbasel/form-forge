"use client";

import SheetUploader from "@repo/ui/views/sheet-uploader.tsx";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

export default function Home() {
  const router = useRouter();

  const handleUploadSuccess = useCallback(
    (sheetId: string) => {
      router.push(`/sheets/${sheetId}`);
    },
    [router]
  );

  // TODO: Make this configurable.

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="font-bold text-3xl tracking-tight">
            Upload PDF Character Sheet
          </h1>
          <p className="mt-2 text-muted-foreground">
            Make your D&D character sheet calculate ability modifiers, skill
            checks, and other values automatically
          </p>
        </div>
        <SheetUploader onUploadSuccess={handleUploadSuccess} />
      </div>
    </div>
  );
}
