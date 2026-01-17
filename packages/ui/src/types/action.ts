import type {
  AttachAbilityModCalcScriptRequest,
  AttachSavingThrowModifierCalculationScriptRequest,
  AttachSkillModifierCalculationScriptRequest,
} from "@repo/api-spec/model";

export type AttachActionRequest =
  | {
      type: "ability-modifier";
      mapping: AttachAbilityModCalcScriptRequest;
    }
  | {
      type: "skill-modifier";
      mapping: AttachSkillModifierCalculationScriptRequest;
    }
  | {
      type: "saving-throw-modifier";
      mapping: AttachSavingThrowModifierCalculationScriptRequest;
    };
