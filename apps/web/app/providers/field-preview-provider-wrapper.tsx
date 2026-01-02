"use client";

import { FieldPreviewProvider } from "@repo/ui/context/field-preview-context.tsx";
import type React from "react";

export default function FieldPreviewProviderWrapper({
  children,
}: Readonly<React.ComponentProps<typeof FieldPreviewProvider>>) {
  return <FieldPreviewProvider>{children}</FieldPreviewProvider>;
}
