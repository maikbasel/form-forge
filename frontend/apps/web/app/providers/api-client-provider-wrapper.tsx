"use client";

import { ApiClientProvider } from "@repo/ui/context/api-client-context";
import type React from "react";
import { apiClient } from "@/app/lib/api-client";

export default function ApiClientProviderWrapper({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <ApiClientProvider client={apiClient}>{children}</ApiClientProvider>;
}