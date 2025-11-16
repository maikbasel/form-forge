"use client";

import { useSheet } from "@repo/ui/context/sheet-context";
import SheetUploader from "@repo/ui/views/sheet-uploader";
import dynamic from "next/dynamic";

const SheetViewer = dynamic(() => import("@repo/ui/views/sheet-viewer"), {
  ssr: false,
});

export default function Home() {
  const { sheetPath } = useSheet();
  let fileUrl;

  if (sheetPath) {
    fileUrl = `http://localhost:8081${sheetPath.startsWith("/") ? sheetPath : `/${sheetPath}`}`;
  }

  // TODO: Make this configurable.

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 p-4 md:flex-row">
        {/* Uploader: top on mobile, left on larger screens */}
        <section className="w-full md:w-1/3 md:max-w-sm">
          <SheetUploader />
        </section>

        {/* Viewer: bottom on mobile, right on larger screens */}
        <section className="min-h-[300px] flex-1">
          {fileUrl && (
            <div className="h-full rounded-md border bg-card">
              <SheetViewer file={fileUrl} />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
