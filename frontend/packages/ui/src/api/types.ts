import { z } from "zod";

// ============================================================================
// Sheets API Types
// ============================================================================

/**
 * Matches backend: SheetFieldDto
 * Represents a single PDF AcroForm field
 */
export const FormFieldSchema = z.object({
  name: z.string(),
});

export type FormField = z.infer<typeof FormFieldSchema>;

/**
 * Matches backend: ListSheetFieldsResponse
 * Response from GET /sheets/{id}/fields
 */
export const ListSheetFieldsResponseSchema = z.object({
  fields: z.array(FormFieldSchema),
});

export type ListSheetFieldsResponse = z.infer<
  typeof ListSheetFieldsResponseSchema
>;

/**
 * Matches backend: UploadSheetResponse
 * Response from POST /sheets
 */
export const UploadSheetResponseSchema = z.object({
  id: z.string().uuid(),
});

export type UploadSheetResponse = z.infer<typeof UploadSheetResponseSchema>;

/**
 * Sheet upload result (combines response body + Location header)
 */
export type UploadSheetResult = {
  id: string;
  location: string;
};

// ============================================================================
// Actions API Types (DnD 5e calculations)
// ============================================================================

/**
 * Matches backend: AttachAbilityModCalcScriptRequest
 * Request for PUT /dnd5e/{sheet_id}/ability-modifier
 */
export const AttachAbilityModifierRequestSchema = z.object({
  abilityScoreFieldName: z.string().min(1),
  abilityModifierFieldName: z.string().min(1),
});

export type AttachAbilityModifierRequest = z.infer<
  typeof AttachAbilityModifierRequestSchema
>;

/**
 * Matches backend: AttachSavingThrowModifierCalculationScriptRequest
 * Request for PUT /dnd5e/{sheet_id}/saving-throw-modifier
 */
export const AttachSavingThrowModifierRequestSchema = z.object({
  abilityModifierFieldName: z.string().min(1),
  proficiencyFieldName: z.string().min(1),
  proficiencyBonusFieldName: z.string().min(1),
  savingThrowModifierFieldName: z.string().min(1),
});

export type AttachSavingThrowModifierRequest = z.infer<
  typeof AttachSavingThrowModifierRequestSchema
>;

/**
 * Matches backend: AttachSkillModifierCalculationScriptRequest
 * Request for PUT /dnd5e/{sheet_id}/skill-modifier
 */
export const AttachSkillModifierRequestSchema = z.object({
  abilityModifierFieldName: z.string().min(1),
  proficiencyFieldName: z.string().min(1),
  expertiseFieldName: z.string().min(1).optional(),
  halfProfFieldName: z.string().min(1).optional(),
  proficiencyBonusFieldName: z.string().min(1),
  skillModifierFieldName: z.string().min(1),
});

export type AttachSkillModifierRequest = z.infer<
  typeof AttachSkillModifierRequestSchema
>;

// ============================================================================
// Generic Action Types (for UI state management)
// ============================================================================

export type ActionType =
  | "ability-modifier"
  | "skill-modifier"
  | "saving-throw-modifier";

export type AppliedAction =
  | {
      type: "ability-modifier";
      mapping: AttachAbilityModifierRequest;
    }
  | {
      type: "skill-modifier";
      mapping: AttachSkillModifierRequest;
    }
  | {
      type: "saving-throw-modifier";
      mapping: AttachSavingThrowModifierRequest;
    };

// ============================================================================
// Upload Progress Callback Types
// ============================================================================

export type UploadProgressCallback = (progress: number) => void;

export type UploadOptions = {
  signal?: AbortSignal;
  onProgress?: UploadProgressCallback;
};

// ============================================================================
// API Error Types
// ============================================================================

/**
 * Matches backend: ApiErrorResponse
 */
export const ApiErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

/**
 * Custom error class for API failures
 */
export class ApiClientError extends Error {
  constructor(
    public statusCode: number,
    public apiError: ApiError,
  ) {
    super(apiError.message);
    this.name = "ApiClientError";
  }

  static fromResponse(statusCode: number, message: string): ApiClientError {
    return new ApiClientError(statusCode, { message });
  }
}