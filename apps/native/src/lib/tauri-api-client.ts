import type { ApiClient, FormField } from "@repo/ui/lib/api.ts";
import type { AttachActionRequest } from "@repo/ui/types/action.ts";
import type { DownloadSheetResult } from "@repo/ui/types/sheet.ts";
import { invoke } from "@tauri-apps/api/core";

interface SheetReferenceResponse {
  id: string;
  original_name: string;
}

interface SheetFieldResponse {
  name: string;
}

interface ExportSheetResponse {
  path: string;
  filename: string;
}

type CalculationActionPayload =
  | {
      AbilityModifier: {
        score_field_name: string;
        modifier_field_name: string;
      };
    }
  | {
      SkillModifier: {
        ability_modifier_field_name: string;
        proficiency_field_name: string;
        expertise_field_name: string | null;
        half_prof_field_name: string | null;
        proficiency_bonus_field_name: string;
        skill_modifier_field_name: string;
      };
    }
  | {
      SavingThrowModifier: {
        ability_modifier_field_name: string;
        proficiency_field_name: string;
        proficiency_bonus_field_name: string;
        saving_throw_modifier_field_name: string;
      };
    };

function mapActionToPayload(
  action: AttachActionRequest
): CalculationActionPayload {
  switch (action.type) {
    case "ability-modifier":
      return {
        AbilityModifier: {
          score_field_name: action.mapping.abilityScoreFieldName,
          modifier_field_name: action.mapping.abilityModifierFieldName,
        },
      };
    case "skill-modifier":
      return {
        SkillModifier: {
          ability_modifier_field_name: action.mapping.abilityModifierFieldName,
          proficiency_field_name: action.mapping.proficiencyFieldName,
          expertise_field_name: action.mapping.expertiseFieldName ?? null,
          half_prof_field_name: action.mapping.halfProfFieldName ?? null,
          proficiency_bonus_field_name:
            action.mapping.proficiencyBonusFieldName,
          skill_modifier_field_name: action.mapping.skillModifierFieldName,
        },
      };
    case "saving-throw-modifier":
      return {
        SavingThrowModifier: {
          ability_modifier_field_name: action.mapping.abilityModifierFieldName,
          proficiency_field_name: action.mapping.proficiencyFieldName,
          proficiency_bonus_field_name:
            action.mapping.proficiencyBonusFieldName,
          saving_throw_modifier_field_name:
            action.mapping.savingThrowModifierFieldName,
        },
      };
    default:
      throw new Error(
        `Unknown action type: ${(action as AttachActionRequest).type}`
      );
  }
}

export function uploadSheetFromPath(
  filePath: string,
  fileName: string
): Promise<SheetReferenceResponse> {
  return invoke<SheetReferenceResponse>("upload_sheet", {
    filePath,
    fileName,
  });
}

export function exportSheet(sheetId: string): Promise<ExportSheetResponse> {
  return invoke<ExportSheetResponse>("export_sheet", { sheetId });
}

export const tauriApiClient: ApiClient = {
  uploadSheet() {
    throw new Error(
      "Use uploadSheetFromPath for Tauri — file picker provides a path, not a File object"
    );
  },

  async getSheetFields(sheetId: string): Promise<FormField[]> {
    const fields = await invoke<SheetFieldResponse[]>("get_sheet_form_fields", {
      sheetId,
    });
    return fields.map((f) => ({ name: f.name }));
  },

  downloadSheet(): Promise<DownloadSheetResult> {
    throw new Error(
      "Use exportSheet for Tauri — desktop export writes to filesystem"
    );
  },

  async attachAction(
    sheetId: string,
    action: AttachActionRequest
  ): Promise<void> {
    const payload = mapActionToPayload(action);
    await invoke("attach_calculation_action", {
      sheetId,
      action: payload,
    });
  },
};
