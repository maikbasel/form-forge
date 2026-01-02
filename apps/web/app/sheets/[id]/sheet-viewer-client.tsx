"use client";

import { Button } from "@repo/ui/components/button.tsx";
import { Skeleton } from "@repo/ui/components/skeleton.tsx";
import { ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Suspense } from "react";

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
  const fileUrl = `/api/sheets/${sheetId}`;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-4">
        <Button asChild size="sm" variant="outline">
          <Link href="/apps/web/public">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Upload New File
          </Link>
        </Button>
      </div>

      <Suspense fallback={<SheetViewerSkeleton />}>
        <div className="flex-1">
          <SheetViewer file={fileUrl} />
        </div>
      </Suspense>
    </div>
  );
}
