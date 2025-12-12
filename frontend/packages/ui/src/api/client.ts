import type {
  AppliedAction,
  FormField,
  UploadOptions,
  UploadSheetResult,
} from "./types.js";

/**
 * Abstract API client interface.
 *
 * This interface defines the contract for communicating with the backend API.
 * Different implementations can handle requests differently:
 * - ServerApiClient: Uses Next.js Server Actions (server-side)
 * - ClientApiClient: Uses direct fetch calls (client-side for Tauri)
 *
 * Components consume this via React Context and don't need to know
 * which implementation they're using.
 */
export type ApiClient = {
  /**
   * Upload a PDF sheet file
   *
   * @param file - The PDF file to upload
   * @param options - Upload options (abort signal, progress callback)
   * @returns Upload result with sheet ID and location
   * @throws {ApiClientError} If upload fails or validation errors occur
   */
  uploadSheet(file: File, options?: UploadOptions): Promise<UploadSheetResult>;

  /**
   * Get form fields for a specific sheet
   *
   * @param sheetId - The UUID of the sheet
   * @returns Array of form fields in the PDF
   * @throws {ApiClientError} If sheet not found or fetch fails
   */
  getSheetFields(sheetId: string): Promise<FormField[]>;

  /**
   * Download a sheet as a Blob
   *
   * @param sheetId - The UUID of the sheet
   * @returns The PDF file as a Blob
   * @throws {ApiClientError} If sheet not found or download fails
   */
  downloadSheet(sheetId: string): Promise<Blob>;

  /**
   * Apply a calculation action to a sheet
   *
   * @param sheetId - The UUID of the sheet
   * @param action - The action to apply (ability modifier, skill modifier, etc.)
   * @throws {ApiClientError} If action attachment fails
   */
  applyAction(sheetId: string, action: AppliedAction): Promise<void>;
};