import { ApiClientError } from "@repo/ui/types/api.ts";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiClientError) {
    return err.problem.detail ?? err.problem.title;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
}
