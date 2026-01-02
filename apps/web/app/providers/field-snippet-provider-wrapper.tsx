"use client";

import { FieldSnippetProvider } from "@repo/ui/context/field-snippet-context.tsx";
import type React from "react";

export default function FieldSnippetProviderWrapper({
  children,
}: Readonly<React.ComponentProps<typeof FieldSnippetProvider>>) {
  return <FieldSnippetProvider>{children}</FieldSnippetProvider>;
}
