import { useCallback, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { useSheet } from "@repo/ui/context/sheet-context";
import { useResizeObserver } from "@wojtekmaj/react-hooks";
import { ChevronLeft, ChevronRight } from "lucide-react";
import useSWR from "swr";
import { z } from "zod";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const resizeObserverOptions = {};

const SheetFieldSchema = z.object({
  name: z.string(),
  rect: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }),
});

const ListSheetFieldsResponseSchema = z.object({
  fields: z.array(SheetFieldSchema),
});

const fetcher = (url: string) =>
  fetch(url)
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return res.json();
    })
    .then((data) => ListSheetFieldsResponseSchema.parse(data));

type SheetViewerProps = {
  file?: File;
};

type FieldBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

type FieldPosition = {
  name: string;
  page: number;
  rect: number[]; // [x1, y1, x2, y2]
  bounds: FieldBounds;
};

export default function SheetViewer({ file }: Readonly<SheetViewerProps>) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [containerRef, setContainerRef] = useState<HTMLElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>();
  const [fieldPositions, setFieldPositions] = useState<FieldPosition[]>([]); // All fields from all pages
  const [selectedFields, setSelectedFields] = useState<string[]>([]); // Changed from single to array
  const [scale, setScale] = useState(1);
  const { sheetId } = useSheet();

  const onResize = useCallback<ResizeObserverCallback>((entries) => {
    const [entry] = entries;

    if (entry) {
      setContainerWidth(entry.contentRect.width);
    }
  }, []);

  useResizeObserver(containerRef, resizeObserverOptions, onResize);

  const nextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, numPages));
  };

  const previousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleFieldSelect = (fieldName: string) => {
    setSelectedFields((prev) => {
      // If field is already selected, remove it
      if (prev.includes(fieldName)) {
        return prev.filter((f) => f !== fieldName);
      }

      // If we already have 6 fields selected, don't add more
      if (prev.length >= 6) {
        return prev;
      }

      // Add the new field
      return [...prev, fieldName];
    });

    const field = fieldPositions.find((f) => f.name === fieldName);
    if (field && field.page !== currentPage) {
      setCurrentPage(field.page);
    }
  };

  // TODO: Generate client from OpenAPI spec.
  const { data, error } = useSWR(
    sheetId ? `http://localhost:8081/sheets/${sheetId}/fields` : null,
    fetcher
  );

  if (error) {
    // FIXME: Handle error better
    if (error.statusCode === 404) {
      return <div>Sheet not found</div>;
    }
    return (
      <div>
        Error {error.statusCode}: {error.message}
      </div>
    );
  }

  const currentPageFields = fieldPositions.filter(
    (f) => f.page === currentPage
  );

  const apiFields = data?.fields.map((f) => f.name) || [];

  const onDocumentLoadSuccess = async (doc: pdfjs.PDFDocumentProxy) => {
    setNumPages(doc.numPages);

    const allFields: FieldPosition[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const annotations = await page.getAnnotations();
      const viewport = page.getViewport({ scale });

      const fields = annotations
        .filter((ann) => apiFields.includes(ann.fieldName))
        .map((ann) => {
          const pdfRect = ann.rect; // [x1, y1, x2, y2]
          return {
            name: ann.fieldName,
            page: i,
            rect: pdfRect,
            bounds: {
              left: pdfRect[0] * scale,
              top: viewport.height - pdfRect[3] * scale,
              right: pdfRect[2] * scale,
              bottom: viewport.height - pdfRect[1] * scale,
              width: (pdfRect[2] - pdfRect[0]) * scale,
              height: (pdfRect[3] - pdfRect[1]) * scale,
            },
          };
        });

      allFields.push(...fields);
    }

    setFieldPositions(allFields);
  };

  return (
    <div className="flex h-screen">
      {/* PDF viewer with overlays */}
      <div className="flex flex-1 flex-col">
        <Card className="flex flex-1 flex-col">
          <CardContent className="flex flex-1 flex-col items-center overflow-auto p-6">
            {/* Selection counter */}
            <div className="mb-4 rounded-md bg-blue-50 px-4 py-2 text-sm">
              <span className="font-medium">
                {selectedFields.length} of 6 fields selected
              </span>
              {selectedFields.length >= 6 && (
                <span className="ml-2 text-blue-600">(Maximum reached)</span>
              )}
            </div>

            <div className="relative inline-block">
              <Document file={file} onLoadSuccess={onDocumentLoadSuccess}>
                <Page
                  className="shadow-lg"
                  pageNumber={currentPage}
                  scale={scale}
                />
              </Document>

              {/* Overlays for current page only */}
              {currentPageFields.map((field, index) => {
                const isSelected = selectedFields.includes(field.name);
                const canSelect = selectedFields.length < 6 || isSelected;

                return (
                  <div
                    className={`box-border transition-all duration-200 ${
                      isSelected
                        ? "z-20 cursor-pointer border-2 border-blue-500 bg-blue-500/25 shadow-xl"
                        : canSelect
                          ? "z-10 cursor-pointer border-2 border-yellow-400/50 bg-yellow-400/10 hover:border-yellow-400 hover:bg-yellow-400/30"
                          : "z-10 cursor-not-allowed border-2 border-gray-300/50 bg-gray-300/10 opacity-50"
                    }
                    `}
                    key={`${field.name}-${index}`}
                    onClick={() => canSelect && handleFieldSelect(field.name)}
                    style={{
                      position: "absolute",
                      left: `${field.bounds.left}px`,
                      top: `${field.bounds.top}px`,
                      width: `${field.bounds.width}px`,
                      height: `${field.bounds.height}px`,
                    }}
                  />
                );
              })}
            </div>
          </CardContent>

          {/* Pagination controls */}
          <div className="flex items-center justify-center gap-4 border-t p-4">
            <Button
              disabled={currentPage <= 1}
              onClick={previousPage}
              size="sm"
              variant="outline"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <span className="font-medium text-sm">
              Page {currentPage} of {numPages || "..."}
            </span>
            <Button
              disabled={currentPage >= (numPages || 1)}
              onClick={nextPage}
              size="sm"
              variant="outline"
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
