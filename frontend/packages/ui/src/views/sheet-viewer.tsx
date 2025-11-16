import { useCallback, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Button } from "@repo/ui/components/button";
import { useResizeObserver } from "@wojtekmaj/react-hooks";
import { ChevronLeft, ChevronRight } from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const resizeObserverOptions = {};

const maxWidth = 800;

type SheetViewerProps = {
  file?: File;
};

export default function SheetViewer({ file }: Readonly<SheetViewerProps>) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [containerRef, setContainerRef] = useState<HTMLElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>();
  const [pagePoint, setPagePoint] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const onResize = useCallback<ResizeObserverCallback>((entries) => {
    const [entry] = entries;

    if (entry) {
      setContainerWidth(entry.contentRect.width);
    }
  }, []);

  useResizeObserver(containerRef, resizeObserverOptions, onResize);

  const onDocumentLoadSuccess = ({
    numPages: loadedNumPages,
  }: {
    numPages: number;
  }) => {
    setNumPages(loadedNumPages);
  };

  const onPageLoadSuccess = (page: pdfjs.PDFPageProxy) => {
    const vp = page.getViewport({ scale: 1 }); // intrinsic PDF size in points
    setPagePoint({ width: vp.width, height: vp.height });
  };

  const nextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, numPages));
  };

  const previousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const renderedWidth = containerWidth
    ? Math.min(containerWidth, maxWidth)
    : maxWidth;
  const renderedHeight = pagePoint
    ? renderedWidth * (pagePoint.height / pagePoint.width)
    : undefined;

  return (
    <div className="flex h-full w-full flex-col">
      <div
        className="flex flex-1 items-center justify-center overflow-auto px-4"
        ref={setContainerRef}
      >
        <Document file={file} onLoadSuccess={onDocumentLoadSuccess}>
          <div
            className="relative mx-auto my-4 w-full"
            style={{ width: "100%", height: "800px" }}
          >
            <Page
              onLoadSuccess={onPageLoadSuccess}
              pageNumber={currentPage}
              renderAnnotationLayer={false}
              renderTextLayer={false}
              width={
                containerWidth ? Math.min(containerWidth, maxWidth) : maxWidth
              }
            />

            {pagePoint && renderedHeight && (
              <svg
                className="pointer-events-none absolute inset-0"
                preserveAspectRatio="none"
                viewBox={`0 0 ${renderedWidth} ${renderedHeight}`}
              />
            )}
          </div>
        </Document>
      </div>

      {numPages > 0 && (
        <div className="border-t bg-background p-4">
          <div className="mx-auto flex max-w-md items-center justify-between">
            <Button
              disabled={currentPage === 1}
              onClick={previousPage}
              size="icon"
              variant="outline"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="text-muted-foreground text-sm">
              Page {currentPage} of {numPages}
            </span>

            <Button
              disabled={currentPage === numPages}
              onClick={nextPage}
              size="icon"
              variant="outline"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
