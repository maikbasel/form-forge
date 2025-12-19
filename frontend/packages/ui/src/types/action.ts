import { z } from "zod";

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
