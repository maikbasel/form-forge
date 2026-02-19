import type { ApiClient, FormField } from "@repo/ui/lib/api.ts";
import type { AttachActionRequest } from "@repo/ui/types/action.ts";
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

export interface SheetSummary {
  id: string;
  originalName: string;
  storedPath: string;
}

export function listSheets(): Promise<SheetSummary[]> {
  return invoke<Array<{ id: string; original_name: string; path: string }>>(
    "list_sheets"
  ).then((items) =>
    items.map((i) => ({
      id: i.id,
      originalName: i.original_name,
      storedPath: i.path,
    }))
  );
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

export function readPdfBytes(filePath: string): Promise<ArrayBuffer> {
  return invoke<ArrayBuffer>("read_pdf_bytes", { filePath });
}

export function copyFileToDir(
  src: string,
  dstDir: string,
  filename: string
): Promise<string> {
  return invoke<string>("copy_file_to_dir", { src, dstDir, filename });
}

export const tauriApiClient: ApiClient = {
  async getSheetFields(sheetId: string): Promise<FormField[]> {
    const fields = await invoke<SheetFieldResponse[]>("get_sheet_form_fields", {
      sheetId,
    });
    return fields.map((f) => ({ name: f.name }));
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
