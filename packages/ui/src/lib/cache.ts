import { mutate } from "swr";

/**
 * Cache key format for sheet fields.
 */
export function getSheetFieldsCacheKey(sheetId: string): string {
  return `sheet-fields-${sheetId}`;
}

/**
 * Invalidates the SWR cache for sheet fields.
 * Call this after uploading a new sheet to ensure fresh data is fetched.
 */
export function invalidateSheetFieldsCache(sheetId: string): void {
  mutate(getSheetFieldsCacheKey(sheetId));
}
