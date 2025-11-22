import {createContext, type ReactNode, useContext, useMemo, useState,} from "react";

type SheetContextState = {
  sheetPath: string | null;
  setSheetPath: (url: string | null) => void;
  sheetId: string | null;
  setSheetId: (id: string | null) => void;
};

const SheetContext = createContext<SheetContextState | undefined>(undefined);

export function SheetProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [sheetPath, setSheetPath] = useState<string | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);

  const value = useMemo(
    () => ({ sheetPath, setSheetPath, sheetId, setSheetId }),
    [sheetPath, sheetId]
  );

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
