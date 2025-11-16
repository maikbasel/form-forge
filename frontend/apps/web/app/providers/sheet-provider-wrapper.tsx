"use client";

import {SheetProvider} from "@repo/ui/context/sheet-context";

export default function SheetProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <SheetProvider>
          {children}
      </SheetProvider>
  );
}
