import { useCallback, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { useSheet } from "@repo/ui/context/sheet-context";
import { useResizeObserver } from "@wojtekmaj/react-hooks";
import { ChevronLeft, ChevronRight } from "lucide-react";
import useSWR from "swr";
import { z } from "zod";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const resizeObserverOptions = {};

const maxWidth = 800;

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

type SheetField = z.infer<typeof SheetFieldSchema>;

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
  const [selectedField, setSelectedField] = useState(null);
  const [scale, setScale] = useState(1);
  const { sheetId } = useSheet();

  const onResize = useCallback<ResizeObserverCallback>((entries) => {
    const [entry] = entries;

    if (entry) {
      setContainerWidth(entry.contentRect.width);
    }
  }, []);

  useResizeObserver(containerRef, resizeObserverOptions, onResize);

  const onDocumentLoadSuccess = async (doc: pdfjs.PDFDocumentProxy) => {
    setNumPages(doc.numPages);

    const allFields: FieldPosition[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const annotations = await page.getAnnotations();
      const viewport = page.getViewport({ scale });

      const fields = annotations
        .filter((ann) => ann.fieldName)
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

  const nextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, numPages));
  };

  const previousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleFieldSelect = (fieldName: string) => {
    setSelectedField(fieldName);

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

  const apiFields = data?.fields || [];

  return (
    <div className="flex h-screen gap-4 p-4">
      {/* Sidebar with field list */}
      <Card className="flex w-64 flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Form Fields</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full">
            <div className="space-y-1 p-4 pt-0">
              {apiFields.map((field, index) => {
                const fieldInfo = fieldPositions.find(
                  (f) => f.name === field.name
                );
                return (
                  <button
                    className={`w-full rounded-md p-3 text-left transition-colors ${
                      selectedField === field.name
                        ? "border border-blue-200 bg-blue-50"
                        : "border border-transparent hover:bg-gray-50"
                    }`}
                    key={`${field.name}-${index}`}
                    onClick={() => handleFieldSelect(field.name)}
                  >
                    <div className="font-medium text-sm">{field.name}</div>
                    {fieldInfo && (
                      <Badge className="mt-1 text-xs" variant="secondary">
                        Page {fieldInfo.page}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* PDF viewer with overlays */}
      <div className="flex flex-1 flex-col">
        <Card className="flex flex-1 flex-col">
          <CardContent className="flex flex-1 flex-col items-center overflow-auto p-6">
            <div className="relative inline-block">
              <Document file={file} onLoadSuccess={onDocumentLoadSuccess}>
                <Page
                  className="shadow-lg"
                  pageNumber={currentPage}
                  scale={scale}
                />
              </Document>

              {/* Overlays for current page only */}
              {currentPageFields.map((field, index) => (
                <div
                  className={`box-border cursor-pointer transition-all duration-200 ${
                    selectedField === field.name
                      ? "border-2 border-blue-500 bg-blue-500/25"
                      : "border-2 border-transparent bg-yellow-400/10 hover:bg-yellow-400/20"
                  }
                  `}
                  key={`${field.name}-${index}`}
                  onClick={() => setSelectedField(field.name)}
                  style={{
                    position: "absolute",
                    left: `${field.bounds.left}px`,
                    top: `${field.bounds.top}px`,
                    width: `${field.bounds.width}px`,
                    height: `${field.bounds.height}px`,
                  }}
                />
              ))}
            </div>
          </CardContent>

          {/* Pagination controls */}
          <div className="flex items-center justify-center gap-4 border-t p-4">
            <Button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
              onClick={() =>
                setCurrentPage((p) => Math.min(numPages || 1, p + 1))
              }
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
