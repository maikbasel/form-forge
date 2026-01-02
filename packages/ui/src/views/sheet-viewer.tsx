import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { Toggle } from "@radix-ui/react-toggle";
import { Badge } from "@repo/ui/components/badge.tsx";
import { Button } from "@repo/ui/components/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card.tsx";
import { FieldSnippet } from "@repo/ui/components/field-snippet.tsx";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@repo/ui/components/hover-card.tsx";
import { ScrollArea } from "@repo/ui/components/scroll-area.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select.tsx";
import { Separator } from "@repo/ui/components/separator.tsx";
import { useApiClient } from "@repo/ui/context/api-client-context.tsx";
import {
  type FieldPosition,
  useFieldSnippet,
} from "@repo/ui/context/field-snippet-context.tsx";
import { useSheet } from "@repo/ui/context/sheet-context.tsx";
import { cn } from "@repo/ui/lib/utils.ts";
import type { AttachActionRequest } from "@repo/ui/types/action.ts";
import { ApiClientError } from "@repo/ui/types/api.ts";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
} from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"; // Worker was copied to public directory.

function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = globalThis.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  globalThis.URL.revokeObjectURL(url);
}

interface FieldRole {
  key: string;
  label: string;
  required: boolean;
  hint: string;
}

interface ActionConfig {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  roles: FieldRole[];
}

type FieldMapping = Record<string, string>;

interface AttachedAction {
  id: string;
  name: string;
  endpoint: string;
  mapping: FieldMapping;
}

const ACTIONS: ActionConfig[] = [
  {
    id: "ability-modifier",
    name: "Ability Modifier",
    description: "Calculate ability modifier from ability score",
    endpoint: "ability-modifier",
    roles: [
      {
        key: "abilityScoreFieldName",
        label: "Ability Score",
        required: true,
        hint: "The base ability score (e.g., STR, DEX)",
      },
      {
        key: "abilityModifierFieldName",
        label: "Target Modifier",
        required: true,
        hint: "Where the calculated modifier will appear",
      },
    ],
  },
  {
    id: "skill-modifier",
    name: "Skill Modifier",
    description: "Calculate skill modifier with proficiency",
    endpoint: "skill-modifier",
    roles: [
      {
        key: "abilityModifierFieldName",
        label: "Ability Modifier",
        required: true,
        hint: "The relevant ability modifier (e.g., WIS_mod for Perception)",
      },
      {
        key: "proficiencyBonusFieldName",
        label: "Proficiency Bonus",
        required: true,
        hint: "Character's proficiency bonus",
      },
      {
        key: "proficiencyFieldName",
        label: "Proficiency",
        required: true,
        hint: "Checkbox indicating proficiency in this skill",
      },
      {
        key: "skillModifierFieldName",
        label: "Target Skill",
        required: true,
        hint: "Where the skill modifier will appear",
      },
      {
        key: "expertiseFieldName",
        label: "Expertise",
        required: false,
        hint: "Checkbox for double proficiency (expertise)",
      },
      {
        key: "halfProfFieldName",
        label: "Half-Prof",
        required: false,
        hint: "Checkbox for half proficiency (Jack of All Trades)",
      },
    ],
  },
  {
    id: "saving-throw-modifier",
    name: "Saving Throw Modifier",
    description: "Calculate saving throw modifier",
    endpoint: "saving-throw-modifier",
    roles: [
      {
        key: "abilityModifierFieldName",
        label: "Ability Modifier",
        required: true,
        hint: "The relevant ability modifier",
      },
      {
        key: "proficiencyBonusFieldName",
        label: "Proficiency Bonus",
        required: true,
        hint: "Character's proficiency bonus",
      },
      {
        key: "proficiencyFieldName",
        label: "Proficiency",
        required: true,
        hint: "Checkbox indicating proficiency in this save",
      },
      {
        key: "savingThrowModifierFieldName",
        label: "Target Saving Throw",
        required: true,
        hint: "Where the save modifier will appear",
      },
    ],
  },
];

function DraggableField({ field }: Readonly<{ field: string }>) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: field,
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <div
          ref={setNodeRef}
          style={style}
          {...listeners}
          {...attributes}
          className={`cursor-move rounded-md border-2 border-border bg-card px-3 py-2 font-mono text-sm shadow-sm transition-all hover:border-primary/50 hover:shadow-md ${
            isDragging ? "opacity-50" : ""
          }`}
        >
          {field}
        </div>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-80" side="right">
        <FieldSnippet fieldName={field} />
      </HoverCardContent>
    </HoverCard>
  );
}

function AvailableFieldsPool({ fields }: Readonly<{ fields: string[] }>) {
  const { setNodeRef, isOver } = useDroppable({
    id: "available-fields",
  });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-sm">Available Fields</h3>
        <Badge variant="secondary">{fields.length} fields</Badge>
      </div>
      <div
        className={`flex min-h-[80px] flex-wrap gap-2 rounded-lg border-2 border-dashed p-4 transition-colors ${
          isOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 bg-muted/30"
        }`}
        ref={setNodeRef}
      >
        {fields.length === 0 ? (
          <span className="text-muted-foreground text-sm italic">
            All fields assigned
          </span>
        ) : (
          fields.map((field) => <DraggableField field={field} key={field} />)
        )}
      </div>
    </div>
  );
}

// Role Drop Zone Component
interface FieldRoleDropZoneProps {
  role: FieldRole;
  assignedField: string | undefined;
  onRemove: () => void;
  onSelectField: (field: string) => void;
  unassignedFields: string[];
  isDragging: boolean;
}

function FieldRoleDropZone({
  role,
  assignedField,
  onRemove,
  onSelectField,
  unassignedFields,
  isDragging,
}: Readonly<FieldRoleDropZoneProps>) {
  const { setNodeRef, isOver } = useDroppable({
    id: `role-${role.key}`,
  });

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
  } = useDraggable({
    id: assignedField || `empty-${role.key}`,
    disabled: !assignedField,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      className={cn(
        "rounded-lg border-2 p-4 transition-all",

        assignedField && "border-green-500 bg-green-500/5",

        !assignedField &&
          role.required &&
          "border-primary border-dashed bg-primary/5",

        !(assignedField || role.required) &&
          "border-muted-foreground/25 border-dashed bg-muted/20",

        isOver && !assignedField && "ring-2 ring-primary/50"
      )}
      ref={setNodeRef}
    >
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="font-semibold text-sm">{role.label}</span>
            {role.required ? (
              <Badge className="text-xs" variant="default">
                Required
              </Badge>
            ) : (
              <Badge className="text-xs" variant="secondary">
                Optional
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-xs">{role.hint}</p>
        </div>
        {assignedField && (
          <Button
            className="h-8 w-8"
            onClick={onRemove}
            size="icon"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {assignedField ? (
        <div
          ref={setDragRef}
          style={style}
          {...listeners}
          {...attributes}
          className="flex cursor-move items-center gap-2 rounded-md border-2 border-green-500 bg-card px-3 py-2.5"
        >
          <Check className="h-4 w-4 text-green-600" />
          <span className="font-medium font-mono text-sm">{assignedField}</span>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="rounded-md border-2 border-dashed p-3 text-center text-muted-foreground text-sm italic">
            {isDragging ? "Drop here" : "Drag a field here"}
          </div>

          {/* Dropdown as alternative */}
          {unassignedFields.length > 0 && (
            <Select onValueChange={onSelectField} value="">
              <SelectTrigger
                data-testid={`role-select-trigger-${role.label.toLowerCase().replaceAll(/\s+/g, "-")}`}
              >
                <SelectValue placeholder="Or select from list..." />
              </SelectTrigger>
              <SelectContent>
                {unassignedFields.map((field) => (
                  <SelectItem key={field} value={field}>
                    {field}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );
}

interface ActionConfigModalProps {
  selectedFields: string[];
  onClose: () => void;
  onAttach: (action: AttachedAction) => void;
}

function ActionConfigModal({
  selectedFields,
  onClose,
  onAttach,
}: Readonly<ActionConfigModalProps>) {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [activeId, setActiveId] = useState<string | null>(null);

  const currentAction = ACTIONS.find((a) => a.id === selectedAction);

  const assignField = (roleKey: string, fieldName: string) => {
    setFieldMapping((prev) => ({
      ...prev,
      [roleKey]: fieldName,
    }));
  };

  const removeAssignment = (roleKey: string) => {
    setFieldMapping((prev) => {
      const next = { ...prev };
      delete next[roleKey];
      return next;
    });
  };

  const getUnassignedFields = () => {
    const assigned = new Set(Object.values(fieldMapping));
    return selectedFields.filter((f) => !assigned.has(f));
  };

  const isValid = () => {
    if (!currentAction) {
      return false;
    }
    const requiredRoles = currentAction.roles.filter((r) => r.required);
    return requiredRoles.every((role) => fieldMapping[role.key]);
  };

  const handleAttach = () => {
    if (!currentAction) {
      return;
    }

    if (!isValid()) {
      return;
    }

    onAttach({
      id: currentAction.id,
      name: currentAction.name,
      endpoint: currentAction.endpoint,
      mapping: fieldMapping,
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) {
      return;
    }

    const fieldName = active.id as string;
    const targetId = over.id as string;

    // Dropping back to available pool
    if (targetId === "available-fields") {
      // Find which role has this field and remove it
      const roleKey = Object.keys(fieldMapping).find(
        (key) => fieldMapping[key] === fieldName
      );
      if (roleKey) {
        removeAssignment(roleKey);
      }
      return;
    }

    // Dropping onto a role
    if (targetId.startsWith("role-")) {
      const roleKey = targetId.replace("role-", "");
      assignField(roleKey, fieldName);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <Card className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden">
        {/* Header */}
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Configure Calculation Action</CardTitle>
              <CardDescription>
                Map selected fields to their roles in the calculation
              </CardDescription>
            </div>
            <Button onClick={onClose} size="icon" variant="ghost">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Action Selection Sidebar */}
          <div className="w-80 border-r bg-muted/30">
            <ScrollArea className="h-full p-6">
              <h3 className="mb-4 font-semibold text-sm">Action Type</h3>
              <div className="space-y-3">
                {ACTIONS.map((action) => (
                  <button
                    className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                      selectedAction === action.id
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card hover:border-primary/50 hover:bg-accent"
                    }`}
                    key={action.id}
                    onClick={() => {
                      setSelectedAction(action.id);
                      setFieldMapping({});
                    }}
                    type="button"
                  >
                    <div className="mb-1 font-semibold text-sm">
                      {action.name}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {action.description}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Mapping Area */}
          <div className="flex-1">
            <ScrollArea className="h-full p-6">
              {currentAction ? (
                <DndContext
                  onDragCancel={handleDragCancel}
                  onDragEnd={handleDragEnd}
                  onDragStart={handleDragStart}
                >
                  <div className="mx-auto max-w-3xl space-y-6">
                    {/* Unassigned Fields Pool */}
                    <AvailableFieldsPool fields={getUnassignedFields()} />

                    <Separator />

                    {/* Role Assignment Slots */}
                    <div>
                      <h3 className="mb-4 font-semibold text-sm">
                        Field Roles
                      </h3>
                      <div className="space-y-4">
                        {currentAction.roles.map((role) => {
                          const assignedField = fieldMapping[role.key];

                          return (
                            <FieldRoleDropZone
                              assignedField={assignedField}
                              isDragging={!!activeId}
                              key={role.key}
                              onRemove={() => removeAssignment(role.key)}
                              onSelectField={(field) =>
                                assignField(role.key, field)
                              }
                              role={role}
                              unassignedFields={getUnassignedFields()}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Drag Overlay */}
                  <DragOverlay>
                    {activeId ? (
                      <div className="cursor-move rounded-md border-2 border-primary bg-card px-3 py-2 font-mono text-sm shadow-lg">
                        {activeId}
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <AlertCircle className="mx-auto mb-3 h-12 w-12 opacity-50" />
                    <p className="font-medium">
                      Select an action type to begin
                    </p>
                    <p className="mt-1 text-sm">
                      Choose from the options on the left
                    </p>
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t bg-muted/30 p-6">
          <div className="text-sm">
            {currentAction &&
              (isValid() ? (
                <span className="flex items-center gap-2 font-medium text-green-600">
                  <Check className="h-4 w-4" />
                  Ready to attach
                </span>
              ) : (
                <span className="flex items-center gap-2 font-medium text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  Assign all required fields
                </span>
              ))}
          </div>
          <div className="flex gap-2">
            <Button onClick={onClose} variant="outline">
              Cancel
            </Button>
            <Button disabled={!isValid()} onClick={handleAttach}>
              Attach Calculation
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

interface SheetViewerProps {
  file?: string;
}

export default function SheetViewer({ file }: Readonly<SheetViewerProps>) {
  const scale = 1;
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [fieldPositions, setFieldPositions] = useState<FieldPosition[]>([]);
  const [pdfDocument, setPdfDocument] = useState<pdfjs.PDFDocumentProxy | null>(
    null
  );
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [showActionModal, setShowActionModal] = useState(false);
  const [attachedActions, setAttachedActions] = useState<AttachedAction[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const { sheetId } = useSheet();
  const apiClient = useApiClient();
  const {
    setFieldPositions: setFieldSnippetPositions,
    setPdfDocument: setFieldSnippetPdfDocument,
  } = useFieldSnippet();

  // Update context when field positions or PDF document change
  useEffect(() => {
    setFieldSnippetPositions(fieldPositions);
    setFieldSnippetPdfDocument(pdfDocument);
  }, [
    fieldPositions,
    pdfDocument,
    setFieldSnippetPositions,
    setFieldSnippetPdfDocument,
  ]);

  const nextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, numPages));
  };

  const previousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleFieldSelect = (fieldName: string) => {
    setSelectedFields((prev) => {
      // If a field is already selected, remove it
      if (prev.includes(fieldName)) {
        return prev.filter((f) => f !== fieldName);
      }

      // Add the new field
      return [...prev, fieldName];
    });

    const field = fieldPositions.find((f) => f.name === fieldName);
    if (field && field.page !== currentPage) {
      setCurrentPage(field.page);
    }
  };

  const { data, error } = useSWR(
    sheetId ? `sheet-fields-${sheetId}` : null,
    () => (sheetId ? apiClient.getSheetFields(sheetId) : Promise.resolve([]))
  );

  if (error) {
    // FIXME: Handle error better
    if (error.statusCode === 404) {
      return <div>Sheet not found</div>;
    }
    return (
      <div>
        Error {error.statusCode}: {error.message}
      </div>
    );
  }

  const currentPageFields = fieldPositions.filter(
    (f) => f.page === currentPage
  );

  const apiFields = data?.map((f) => f.name) || [];

  const onDocumentLoadSuccess = async (doc: pdfjs.PDFDocumentProxy) => {
    setNumPages(doc.numPages);
    setPdfDocument(doc); // Store PDF document for preview rendering

    const allFields: FieldPosition[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const annotations = await page.getAnnotations();
      const viewport = page.getViewport({ scale });

      const fields = annotations
        .filter((ann) => apiFields.includes(ann.fieldName))
        .map((ann) => {
          const pdfRect = ann.rect; // [x1, y1, x2, y2]
          return {
            name: ann.fieldName,
            page: i,
            rect: pdfRect,
            bounds: {
              left: pdfRect[0] * scale,
              top: viewport.height - pdfRect[3] * scale,
              right: pdfRect[2] * scale,
              bottom: viewport.height - pdfRect[1] * scale,
              width: (pdfRect[2] - pdfRect[0]) * scale,
              height: (pdfRect[3] - pdfRect[1]) * scale,
            },
          };
        });

      allFields.push(...fields);
    }

    setFieldPositions(allFields);
  };

  const handleAttachAction = async (config: AttachedAction) => {
    // TODO: Handle case where an action will overrides a previously attached action.
    if (!sheetId) {
      toast.error("No sheet ID available");
      return;
    }

    try {
      // Transform AttachedAction to Action for the API
      const action: AttachActionRequest = {
        type: config.id as AttachActionRequest["type"],
        mapping: config.mapping,
      } as AttachActionRequest;

      await apiClient.attachAction(sheetId, action);

      setAttachedActions((prev) => [...prev, config]);
      setShowActionModal(false);
      // Only unselect fields that were used in the action
      const usedFields = new Set(Object.values(config.mapping));
      setSelectedFields((prev) =>
        prev.filter((field) => !usedFields.has(field))
      );
      toast.success(`${config.name} attached successfully`);
    } catch (err) {
      let errorMessage: string;
      if (err instanceof ApiClientError) {
        errorMessage = err.apiError.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      } else {
        errorMessage = "Unknown error";
      }

      console.error(errorMessage);
      toast.error(`Failed to attach ${config.name}: ${errorMessage}`);
    }
  };

  const handleDownloadSheet = async () => {
    if (!sheetId) {
      return;
    }

    setIsDownloading(true);

    try {
      const { blob, filename } = await apiClient.downloadSheet(sheetId);

      triggerBrowserDownload(blob, filename);
      toast.success("Sheet downloaded successfully");
    } catch (err) {
      let errorMessage: string;
      if (err instanceof ApiClientError) {
        errorMessage = err.apiError.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      } else {
        errorMessage = "Unknown error";
      }

      toast.error(`Failed to download sheet: ${errorMessage}`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* PDF viewer with overlays */}
      <div className="flex flex-1 flex-col p-6">
        <Card className="flex flex-1 flex-col overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">
                  Character Sheet Editor
                </CardTitle>
                <CardDescription>
                  Select fields to configure calculations
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  disabled={isDownloading || !sheetId}
                  onClick={handleDownloadSheet}
                  size="sm"
                  variant="outline"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {isDownloading ? "Downloading..." : "Download"}
                </Button>
                {selectedFields.length > 0 && (
                  <>
                    <Button
                      onClick={() => setSelectedFields([])}
                      size="sm"
                      variant="outline"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Clear
                    </Button>
                    <Button onClick={() => setShowActionModal(true)} size="sm">
                      Configure Calculation
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Selected Fields */}
            {selectedFields.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {selectedFields.map((field) => (
                  <Badge className="gap-1" key={field} variant="secondary">
                    {field}
                    <button
                      className="ml-1 hover:text-destructive"
                      onClick={() => handleFieldSelect(field)}
                      type="button"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardHeader>

          <Separator />

          <CardContent className="flex flex-1 flex-col items-center overflow-auto p-6">
            <div className="relative inline-block">
              <Document file={file} onLoadSuccess={onDocumentLoadSuccess}>
                <Page
                  className="shadow-lg"
                  pageNumber={currentPage}
                  scale={scale}
                />
              </Document>

              {/* Overlays for current page only */}
              {currentPageFields.map((field, index) => {
                const isSelected = selectedFields.includes(field.name);

                return (
                  <Toggle
                    aria-label={`Select field ${field.name}`}
                    className={cn(
                      "box-border transition-all duration-200",
                      "data-[state=on]:z-20 data-[state=on]:border-2 data-[state=on]:border-blue-500 data-[state=on]:bg-blue-500/25 data-[state=on]:shadow-xl",
                      "data-[state=off]:z-10 data-[state=off]:border-2 data-[state=off]:border-yellow-400/50 data-[state=off]:bg-yellow-400/10",
                      "hover:data-[state=off]:border-yellow-400 hover:data-[state=off]:bg-yellow-400/30"
                    )}
                    key={`${field.name}-${index}`}
                    onPressedChange={() => handleFieldSelect(field.name)}
                    pressed={isSelected}
                    style={{
                      position: "absolute",
                      left: `${field.bounds.left}px`,
                      top: `${field.bounds.top}px`,
                      width: `${field.bounds.width}px`,
                      height: `${field.bounds.height}px`,
                    }}
                  />
                );
              })}
            </div>
          </CardContent>

          {/* Pagination controls */}
          <div className="flex items-center justify-center gap-4 border-t p-4">
            <Button
              disabled={currentPage <= 1}
              onClick={previousPage}
              size="sm"
              variant="outline"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <span className="font-medium text-sm">
              Page {currentPage} of {numPages || "..."}
            </span>
            <Button
              disabled={currentPage >= (numPages || 1)}
              onClick={nextPage}
              size="sm"
              variant="outline"
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>

      {/* Sidebar - Attached Actions */}
      <div className="w-96 p-6 pl-0">
        <Card className="flex h-full flex-col">
          <CardHeader>
            <CardTitle className="text-lg">Attached Actions</CardTitle>
            <CardDescription>
              {attachedActions.length} calculation
              {attachedActions.length === 1 ? "" : "s"} configured
            </CardDescription>
          </CardHeader>

          <Separator />

          <ScrollArea className="flex-1 p-6">
            {attachedActions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <div className="mb-3 rounded-full bg-muted p-3">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <p className="font-medium">No actions configured yet</p>
                <p className="mt-1 text-sm">
                  Select fields and configure an action
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {attachedActions.map((attachedAction, index) => {
                  const action = ACTIONS.find(
                    (a) => a.id === attachedAction.id
                  );

                  if (!action) {
                    // TODO: Improve error handling
                    return (
                      <Card
                        className="border-destructive bg-muted/50"
                        key={`${attachedAction.id.toLowerCase()}-${index}`}
                      >
                        <CardHeader className="p-4 pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
                              <div>
                                <div className="font-semibold text-destructive text-sm">
                                  Unknown Action
                                </div>
                                <div className="mt-0.5 text-muted-foreground text-xs">
                                  {attachedAction.id}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    );
                  }

                  return (
                    <Card
                      className="bg-muted/50"
                      key={`${attachedAction.id.toLowerCase()}-${index}`}
                    >
                      <CardHeader className="p-4 pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold text-sm">
                              {action.name}
                            </div>
                            <div className="mt-0.5 text-muted-foreground text-xs">
                              /{action.endpoint}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="space-y-1.5">
                          {Object.entries(attachedAction.mapping).map(
                            ([roleKey, fieldName]) => {
                              const fieldRole = action.roles.find(
                                (r) => r.key === roleKey
                              );

                              // TODO: Improve error handling
                              return (
                                <div
                                  className="flex items-start gap-2 text-xs"
                                  key={roleKey}
                                >
                                  <span className="min-w-[100px] text-muted-foreground">
                                    {fieldRole ? (
                                      <>{fieldRole.label}:</>
                                    ) : (
                                      <span className="flex items-center gap-1 text-destructive">
                                        <AlertCircle className="h-3 w-3" />
                                        {roleKey}:
                                      </span>
                                    )}
                                  </span>
                                  <Badge
                                    className="font-mono text-xs"
                                    variant={
                                      fieldRole ? "outline" : "destructive"
                                    }
                                  >
                                    {fieldName}
                                  </Badge>
                                </div>
                              );
                            }
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </Card>
      </div>

      {/* Action Configuration Modal */}
      {showActionModal && (
        <ActionConfigModal
          onAttach={handleAttachAction}
          onClose={() => setShowActionModal(false)}
          selectedFields={selectedFields}
        />
      )}
    </div>
  );
}
