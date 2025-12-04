"use client";

import { SheetProvider } from "@repo/ui/context/sheet-context";
import type React from "react";

export default function SheetProviderWrapper({
  children,
}: Readonly<React.ComponentProps<typeof SheetProvider>>) {
  return <SheetProvider>{children}</SheetProvider>;
}
