import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

type SheetContextState = {
  sheetPath: string | null;
  setSheetPath: (url: string | null) => void;
};

const SheetContext = createContext<SheetContextState | undefined>(undefined);

export function SheetProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [sheetPath, setSheetPath] = useState<string | null>(null);

  const value = useMemo(() => ({ sheetPath, setSheetPath }), [sheetPath]);

  return (
    <SheetContext.Provider value={value}>{children}</SheetContext.Provider>
  );
}

export function useSheet() {
  const ctx = useContext(SheetContext);
  if (!ctx) {
    throw new Error("useSheet must be used within a SheetProvider");
  }
  return ctx;
}
