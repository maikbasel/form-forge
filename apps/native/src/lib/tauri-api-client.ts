import type { ApiClient, FormField } from "@repo/ui/lib/api.ts";
import type {
  ActionTypeMetadata,
  AttachActionRequest,
} from "@repo/ui/types/action.ts";
import { invoke } from "@tauri-apps/api/core";

interface SheetReferenceResponse {
  id: string;
  original_name: string;
}

interface SheetFieldResponse {
  name: string;
}

interface ExportSheetResponse {
  filename: string;
  path: string;
}

export interface SheetSummary {
  actionCount: number;
  createdAt: string;
  id: string;
  originalName: string;
  storedPath: string;
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
  actionType: string;
  id: string;
  mapping: Record<string, unknown>;
  targetField: string;
}

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

  async getActionTypes(): Promise<ActionTypeMetadata[]> {
    return await invoke<ActionTypeMetadata[]>("list_action_types");
  },

  async attachAction(
    sheetId: string,
    action: AttachActionRequest
  ): Promise<void> {
    // Build the serde externally-tagged enum: { "ActionLabel": { field mappings } }
    const payload = { [action.actionLabel]: action.mapping };
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

    // Fetch catalog to map PascalCase actionType to kebab-case id
    const catalog = await this.getActionTypes();
    const labelToId = new Map(
      catalog.map((meta) => [meta.actionLabel, meta.id])
    );

    return items.map((item) => {
      const actionId = labelToId.get(item.actionType) ?? item.actionType;
      return {
        id: actionId,
        name: item.actionType,
        endpoint: "actions",
        targetField: item.targetField,
        mapping: extractFieldMapping(item.actionType, item.mapping),
      };
    });
  },
};
