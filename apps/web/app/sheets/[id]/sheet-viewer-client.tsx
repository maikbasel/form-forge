"use client";

import { Button } from "@repo/ui/components/button.tsx";
import { Skeleton } from "@repo/ui/components/skeleton.tsx";
import { ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useTranslation } from "react-i18next";

const SheetViewer = dynamic(
  () =>
    import("pdfjs-dist").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return import("@repo/ui/views/sheet-viewer.tsx");
    }),
  { ssr: false, loading: () => <SheetViewerSkeleton /> }
);

// Mirrors the editor: sheet card on the left, calculations panel on the right
// from lg up, stacked below that.
function SheetViewerSkeleton() {
  return (
    <div
      aria-busy="true"
      className="flex flex-col gap-6 p-6 lg:h-full lg:flex-row"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 rounded-lg border p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
        <Skeleton className="mx-auto h-[600px] w-full max-w-[612px] lg:h-auto lg:flex-1" />
      </div>
      <div className="flex flex-col gap-4 rounded-lg border p-6 lg:w-96">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}

interface SheetViewerClientProps {
  sheetId: string;
}

export default function SheetViewerClient({ sheetId }: SheetViewerClientProps) {
  const { t } = useTranslation();
  const fileUrl = `/api/sheets/${sheetId}`;

  return (
    // From lg up, fill the window below the sticky header (h-14 + 1px border)
    // and the layout's py-8 so the editor scrolls inside itself and its page
    // controls stay on screen. Narrower windows stack and scroll the page.
    <div className="flex flex-col gap-4 lg:h-[calc(100dvh-3.5rem-1px-4rem)] lg:min-h-[32rem]">
      <div className="flex items-center gap-4">
        <Button asChild size="sm" variant="outline">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("common:back")}
          </Link>
        </Button>
      </div>

      <div className="min-h-0 flex-1">
        <SheetViewer file={fileUrl} sheetId={sheetId} />
      </div>
    </div>
  );
}
