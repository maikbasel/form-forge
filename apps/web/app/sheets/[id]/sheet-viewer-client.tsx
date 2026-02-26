"use client";

import { Button } from "@repo/ui/components/button.tsx";
import { GlobalWorkerOptions } from "pdfjs-dist";

GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

import { Skeleton } from "@repo/ui/components/skeleton.tsx";
import { ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Suspense } from "react";
import { useTranslation } from "react-i18next";

const SheetViewer = dynamic(() => import("@repo/ui/views/sheet-viewer.tsx"), {
  ssr: false,
});

function SheetViewerSkeleton() {
  return (
    <div className="flex h-full gap-4">
      <div className="w-80 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[600px] w-full" />
      </div>

      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-48" />
        </div>
        <Skeleton className="h-[800px] w-full" />
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
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-4">
        <Button asChild size="sm" variant="outline">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("common:back")}
          </Link>
        </Button>
      </div>

      <Suspense fallback={<SheetViewerSkeleton />}>
        <div className="flex-1">
          <SheetViewer file={fileUrl} sheetId={sheetId} />
        </div>
      </Suspense>
    </div>
  );
}
