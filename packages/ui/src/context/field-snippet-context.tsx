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
  rect?: [number, number, number, number]; // [x1, y1, x2, y2]
  bounds: FieldBounds;
}

interface FieldSnippetContextState {
  fieldPositions: FieldPosition[];
  setFieldPositions: (positions: FieldPosition[]) => void;
  pdfDocument: pdfjs.PDFDocumentProxy | null;
  setPdfDocument: (doc: pdfjs.PDFDocumentProxy | null) => void;
}

const FieldSnippetContext = createContext<FieldSnippetContextState | undefined>(
  undefined
);

export function FieldSnippetProvider({
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
    <FieldSnippetContext.Provider value={value}>
      {children}
    </FieldSnippetContext.Provider>
  );
}

export function useFieldSnippet() {
  const ctx = useContext(FieldSnippetContext);
  if (!ctx) {
    throw new Error(
      "useFieldSnippet must be used within a FieldSnippetProvider"
    );
  }
  return ctx;
}
