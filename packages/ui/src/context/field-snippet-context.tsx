import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";
import type { pdfjs } from "react-pdf";

interface FieldBounds {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
}

export interface FieldPosition {
  bounds: FieldBounds;
  name: string;
  page: number;
  rect?: [number, number, number, number]; // [x1, y1, x2, y2]
}

interface FieldSnippetContextState {
  fieldPositions: FieldPosition[];
  pdfDocument: pdfjs.PDFDocumentProxy | null;
  setFieldPositions: (positions: FieldPosition[]) => void;
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
