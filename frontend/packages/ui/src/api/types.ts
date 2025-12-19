import { z } from "zod";

export const FormFieldSchema = z.object({
  name: z.string(),
});

export type FormField = z.infer<typeof FormFieldSchema>;

export const ListSheetFieldsResponseSchema = z.object({
  fields: z.array(FormFieldSchema),
});

export type ListSheetFieldsResponse = z.infer<
  typeof ListSheetFieldsResponseSchema
>;

export const UploadSheetResponseSchema = z.object({
  id: z.string().uuid(),
});

export type UploadSheetResponse = z.infer<typeof UploadSheetResponseSchema>;

export type UploadSheetResult = {
  id: string;
  location: string;
};

export const AttachAbilityModifierRequestSchema = z.object({
  abilityScoreFieldName: z.string().min(1),
  abilityModifierFieldName: z.string().min(1),
});

export type AttachAbilityModifierRequest = z.infer<
  typeof AttachAbilityModifierRequestSchema
>;

export const AttachSavingThrowModifierRequestSchema = z.object({
  abilityModifierFieldName: z.string().min(1),
  proficiencyFieldName: z.string().min(1),
  proficiencyBonusFieldName: z.string().min(1),
  savingThrowModifierFieldName: z.string().min(1),
});

export type AttachSavingThrowModifierRequest = z.infer<
  typeof AttachSavingThrowModifierRequestSchema
>;

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


export type UploadProgressCallback = (progress: number) => void;

export type UploadOptions = {
  signal?: AbortSignal;
  onProgress?: UploadProgressCallback;
};

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
  statusCode: number;
  apiError: ApiError;

  constructor(
    statusCode: number,
    apiError: ApiError,
  ) {
    super(apiError.message);
    this.name = "ApiClientError";
    this.statusCode = statusCode;
    this.apiError = apiError;
  }

  static fromResponse(statusCode: number, message: string): ApiClientError {
    return new ApiClientError(statusCode, { message });
  }
}