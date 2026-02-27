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
        abilityScoreFieldName: string;
        abilityModifierFieldName: string;
      };
    }
  | {
      SkillModifier: {
        abilityModifierFieldName: string;
        proficiencyFieldName: string;
        expertiseFieldName: string | null;
        halfProfFieldName: string | null;
        proficiencyBonusFieldName: string;
        skillModifierFieldName: string;
      };
    }
  | {
      SavingThrowModifier: {
        abilityModifierFieldName: string;
        proficiencyFieldName: string;
        proficiencyBonusFieldName: string;
        savingThrowModifierFieldName: string;
      };
    };

function mapActionToPayload(
  action: AttachActionRequest
): CalculationActionPayload {
  switch (action.type) {
    case "ability-modifier":
      return {
        AbilityModifier: {
          abilityScoreFieldName: action.mapping.abilityScoreFieldName,
          abilityModifierFieldName: action.mapping.abilityModifierFieldName,
        },
      };
    case "skill-modifier":
      return {
        SkillModifier: {
          abilityModifierFieldName: action.mapping.abilityModifierFieldName,
          proficiencyFieldName: action.mapping.proficiencyFieldName,
          expertiseFieldName: action.mapping.expertiseFieldName ?? null,
          halfProfFieldName: action.mapping.halfProfFieldName ?? null,
          proficiencyBonusFieldName: action.mapping.proficiencyBonusFieldName,
          skillModifierFieldName: action.mapping.skillModifierFieldName,
        },
      };
    case "saving-throw-modifier":
      return {
        SavingThrowModifier: {
          abilityModifierFieldName: action.mapping.abilityModifierFieldName,
          proficiencyFieldName: action.mapping.proficiencyFieldName,
          proficiencyBonusFieldName: action.mapping.proficiencyBonusFieldName,
          savingThrowModifierFieldName:
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
  createdAt: string;
  actionCount: number;
}

export function listSheets(): Promise<SheetSummary[]> {
  return invoke<
    Array<{
      id: string;
      original_name: string;
      path: string;
      created_at: string;
      action_count: number;
    }>
  >("list_sheets").then((items) =>
    items.map((i) => ({
      id: i.id,
      originalName: i.original_name,
      storedPath: i.path,
      createdAt: i.created_at,
      actionCount: i.action_count,
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

export function copyFile(src: string, dst: string): Promise<void> {
  return invoke<void>("copy_file", { src, dst });
}

interface AttachedActionCommandResponse {
  id: string;
  actionType: string;
  targetField: string;
  mapping: Record<string, unknown>;
}

const ACTION_TYPE_MAP: Record<string, { name: string; endpoint: string }> = {
  AbilityModifier: { name: "Ability Modifier", endpoint: "ability-modifier" },
  SavingThrowModifier: {
    name: "Saving Throw Modifier",
    endpoint: "saving-throw-modifier",
  },
  SkillModifier: { name: "Skill Modifier", endpoint: "skill-modifier" },
};

function extractFieldMapping(
  actionType: string,
  mapping: Record<string, unknown>
): Record<string, string> {
  const variant = mapping[actionType] as Record<string, string> | undefined;
  if (variant) {
    return Object.fromEntries(
      Object.entries(variant).filter(([, v]) => typeof v === "string")
    );
  }
  return {};
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

  async listAttachedActions(sheetId: string) {
    const items = await invoke<AttachedActionCommandResponse[]>(
      "list_attached_actions",
      { sheetId }
    );
    return items.map((item) => {
      const meta = ACTION_TYPE_MAP[item.actionType] ?? {
        name: item.actionType,
        endpoint: item.actionType.toLowerCase(),
      };
      return {
        id: meta.endpoint,
        name: meta.name,
        endpoint: meta.endpoint,
        mapping: extractFieldMapping(item.actionType, item.mapping),
      };
    });
  },
};
