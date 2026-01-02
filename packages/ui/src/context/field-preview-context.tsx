import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";
import type { pdfjs } from "react-pdf";

interface FieldBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface FieldPosition {
  name: string;
  page: number;
  rect: number[]; // [x1, y1, x2, y2]
  bounds: FieldBounds;
}

interface FieldPreviewContextState {
  fieldPositions: FieldPosition[];
  setFieldPositions: (positions: FieldPosition[]) => void;
  pdfDocument: pdfjs.PDFDocumentProxy | null;
  setPdfDocument: (doc: pdfjs.PDFDocumentProxy | null) => void;
}

const FieldPreviewContext = createContext<FieldPreviewContextState | undefined>(
  undefined
);

export function FieldPreviewProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [fieldPositions, setFieldPositions] = useState<FieldPosition[]>([]);
  const [pdfDocument, setPdfDocument] = useState<pdfjs.PDFDocumentProxy | null>(
    null
  );

  const value = useMemo(
    () => ({
      fieldPositions,
      setFieldPositions,
      pdfDocument,
      setPdfDocument,
    }),
    [fieldPositions, pdfDocument]
  );

  return (
    <FieldPreviewContext.Provider value={value}>
      {children}
    </FieldPreviewContext.Provider>
  );
}

export function useFieldPreview() {
  const ctx = useContext(FieldPreviewContext);
  if (!ctx) {
    throw new Error(
      "useFieldPreview must be used within a FieldPreviewProvider"
    );
  }
  return ctx;
}
