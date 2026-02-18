import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, type pdfjs } from "react-pdf";
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
import { Spinner } from "@repo/ui/components/spinner.tsx";
import { useApiClient } from "@repo/ui/context/api-client-context.tsx";
import {
  type FieldPosition,
  useFieldSnippet,
} from "@repo/ui/context/field-snippet-context.tsx";
import { getSheetFieldsCacheKey } from "@repo/ui/lib/cache.ts";
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
    <HoverCard open={!isDragging && undefined} openDelay={700}>
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
  onAttach: (action: AttachedAction) => Promise<void>;
}

function ActionConfigModal({
  selectedFields,
  onClose,
  onAttach,
}: Readonly<ActionConfigModalProps>) {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isAttaching, setIsAttaching] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const currentAction = ACTIONS.find((a) => a.id === selectedAction);

  const assignField = (roleKey: string, fieldName: string) => {
    // Capture scroll position before state change
    const viewport = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement | null;
    const scrollTop = viewport?.scrollTop ?? 0;

    setFieldMapping((prev) => ({
      ...prev,
      [roleKey]: fieldName,
    }));

    // Restore scroll position after React re-renders
    requestAnimationFrame(() => {
      if (viewport) {
        viewport.scrollTop = scrollTop;
      }
    });
  };

  const removeAssignment = (roleKey: string) => {
    setFieldMapping((prev) => {
      const next = { ...prev };
      delete next[roleKey];
      return next;
    });
  };

  const unassignedFields = useMemo(() => {
    const assigned = new Set(Object.values(fieldMapping));
    return selectedFields.filter((f) => !assigned.has(f));
  }, [fieldMapping, selectedFields]);

  const sortedRoles = useMemo(() => {
    if (!currentAction) {
      return [];
    }
    return [...currentAction.roles].sort((a, b) => {
      const aHasField = !!fieldMapping[a.key];
      const bHasField = !!fieldMapping[b.key];
      if (aHasField !== bHasField) {
        return aHasField ? 1 : -1;
      }
      return 0;
    });
  }, [currentAction, fieldMapping]);

  const isValid = () => {
    if (!currentAction) {
      return false;
    }
    const requiredRoles = currentAction.roles.filter((r) => r.required);
    return requiredRoles.every((role) => fieldMapping[role.key]);
  };

  const handleAttach = async () => {
    if (!currentAction) {
      return;
    }

    if (!isValid()) {
      return;
    }

    setIsAttaching(true);
    try {
      await onAttach({
        id: currentAction.id,
        name: currentAction.name,
        endpoint: currentAction.endpoint,
        mapping: fieldMapping,
      });
    } finally {
      setIsAttaching(false);
    }
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
          <div className="flex-1" ref={scrollAreaRef}>
            <ScrollArea className="h-full p-6">
              {currentAction ? (
                <DndContext
                  onDragCancel={handleDragCancel}
                  onDragEnd={handleDragEnd}
                  onDragStart={handleDragStart}
                >
                  <div className="mx-auto max-w-3xl space-y-6">
                    {/* Unassigned Fields Pool */}
                    <AvailableFieldsPool fields={unassignedFields} />

                    <Separator />

                    {/* Role Assignment Slots */}
                    <div>
                      <h3 className="mb-4 font-semibold text-sm">
                        Field Roles
                      </h3>
                      <div className="space-y-4">
                        {sortedRoles.map((role) => {
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
                              unassignedFields={unassignedFields}
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
            <Button disabled={isAttaching} onClick={onClose} variant="outline">
              Cancel
            </Button>
            <Button disabled={!isValid() || isAttaching} onClick={handleAttach}>
              {isAttaching && <Spinner />}
              {isAttaching ? "Attaching..." : "Attach Calculation"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export interface PdfLoadStrategy {
  loadPdfUrl(fileRef: string): Promise<string>;
}

export interface DownloadStrategy {
  download(sheetId: string): Promise<void>;
}

interface FieldOverlayProps {
  field: FieldPosition;
  isSelected: boolean;
  isHovered: boolean;
  isFlashing: boolean;
  onMouseEnter: (name: string) => void;
  onMouseLeave: () => void;
  onToggle: (name: string) => void;
}

const FieldOverlay = memo(function FieldOverlay({
  field,
  isSelected,
  isHovered,
  isFlashing,
  onMouseEnter,
  onMouseLeave,
  onToggle,
}: FieldOverlayProps) {
  const handleEnter = useCallback(
    () => onMouseEnter(field.name),
    [onMouseEnter, field.name]
  );
  const handleLeave = useCallback(() => onMouseLeave(), [onMouseLeave]);
  const handleToggle = useCallback(
    () => onToggle(field.name),
    [onToggle, field.name]
  );

  return (
    <Toggle
      aria-label={`Select field ${field.name}`}
      className={cn(
        "box-border",
        "data-[state=on]:z-20 data-[state=on]:border-2 data-[state=on]:border-blue-500 data-[state=on]:bg-blue-500/25 data-[state=on]:shadow-xl",
        "data-[state=off]:z-10 data-[state=off]:border-2 data-[state=off]:border-yellow-400/50 data-[state=off]:bg-yellow-400/10",
        "hover:data-[state=off]:border-yellow-400 hover:data-[state=off]:bg-yellow-400/30",
        isHovered &&
          "!border-blue-500 !bg-blue-500/30 z-30 shadow-xl ring-2 ring-blue-400",
        isFlashing && "z-30 animate-flash"
      )}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onPressedChange={handleToggle}
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
});

interface SheetViewerProps {
  file?: string;
  sheetId?: string;
  pdfLoader?: PdfLoadStrategy;
  downloadHandler?: DownloadStrategy;
}

export default function SheetViewer({
  file,
  sheetId,
  pdfLoader,
  downloadHandler,
}: Readonly<SheetViewerProps>) {
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
  // State for pre-signed PDF URL
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isPdfUrlLoading, setIsPdfUrlLoading] = useState(false);
  const [pdfUrlError, setPdfUrlError] = useState<string | null>(null);
  // State for hover tracking
  const [hoveredFieldName, setHoveredFieldName] = useState<string | null>(null);
  const [flashingFieldName, setFlashingFieldName] = useState<string | null>(
    null
  );

  // Ref to manage flash timeout (prevents memory leaks)
  const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Refs for stable callbacks (avoid stale closure deps)
  const fieldPositionsRef = useRef<FieldPosition[]>(fieldPositions);
  useEffect(() => {
    fieldPositionsRef.current = fieldPositions;
  }, [fieldPositions]);

  const currentPageRef = useRef<number>(currentPage);
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  // Stable event handlers — stable identity prevents cascade re-renders on hover/select
  const handleMouseEnter = useCallback(
    (name: string) => setHoveredFieldName(name),
    []
  );
  const handleMouseLeave = useCallback(() => setHoveredFieldName(null), []);
  const handleFieldSelect = useCallback((fieldName: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldName)
        ? prev.filter((f) => f !== fieldName)
        : [...prev, fieldName]
    );
    const field = fieldPositionsRef.current.find((f) => f.name === fieldName);
    if (field && field.page !== currentPageRef.current) {
      setCurrentPage(field.page);
    }
  }, []);

  const apiClient = useApiClient();
  const {
    setFieldPositions: setFieldSnippetPositions,
    setPdfDocument: setFieldSnippetPdfDocument,
  } = useFieldSnippet();

  // Fetch sheet fields data
  const cacheKey = sheetId ? getSheetFieldsCacheKey(sheetId) : null;

  const { data, error } = useSWR(
    cacheKey,
    () => (sheetId ? apiClient.getSheetFields(sheetId) : Promise.resolve([])),
    {
      revalidateOnMount: true,
      dedupingInterval: 0,
    }
  );

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

  // Cleanup effect to clear timeout on unmount
  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
    };
  }, []);

  // Fetch PDF URL (via strategy or default pre-signed URL fetch)
  useEffect(() => {
    if (!file) {
      return;
    }

    const fetchPdfUrl = async () => {
      setIsPdfUrlLoading(true);
      setPdfUrlError(null);

      try {
        if (pdfLoader) {
          const url = await pdfLoader.loadPdfUrl(file);
          setPdfUrl(url);
        } else {
          const response = await fetch(file);

          if (!response.ok) {
            const errorData = await response
              .json()
              .catch(() => ({ message: "Unknown error" }));
            throw new Error(errorData.message ?? "Failed to fetch PDF URL");
          }

          const data = await response.json();
          setPdfUrl(data.url);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load PDF";
        setPdfUrlError(message);
        toast.error(message);
      } finally {
        setIsPdfUrlLoading(false);
      }
    };

    fetchPdfUrl();
  }, [file, pdfLoader]);

  // Recalculate field positions when data changes — all pages fetched concurrently
  useEffect(() => {
    if (!(pdfDocument && data)) {
      return;
    }

    const extractFieldPositions = async () => {
      const apiFields = new Set(data.map((f) => f.name));

      const pageData = await Promise.all(
        Array.from({ length: pdfDocument.numPages }, async (_, i) => {
          const pageNum = i + 1;
          const page = await pdfDocument.getPage(pageNum);
          const annotations = await page.getAnnotations();
          const viewport = page.getViewport({ scale });
          return { pageNum, annotations, viewport };
        })
      );

      const allFields = pageData.flatMap(({ pageNum, annotations, viewport }) =>
        annotations
          .filter((ann) => apiFields.has(ann.fieldName))
          .map((ann) => {
            const pdfRect = ann.rect;
            return {
              name: ann.fieldName,
              page: pageNum,
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
          })
      );

      setFieldPositions(allFields);
    };

    extractFieldPositions();
  }, [data, pdfDocument]);

  const nextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, numPages));
  };

  const previousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleBadgeClick = (fieldName: string) => {
    // Find the field's page
    const field = fieldPositions.find((f) => f.name === fieldName);
    if (!field) {
      return;
    }

    const scrollToField = () => {
      // Find the field overlay element by its aria-label
      const fieldElement = document.querySelector(
        `button[aria-label="Select field ${fieldName}"]`
      );

      if (fieldElement) {
        // Use scrollIntoView for smooth, browser-native scrolling
        fieldElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        });
      }
    };

    // Navigate to the field's page if not already there
    const needsPageChange = field.page !== currentPage;
    if (needsPageChange) {
      setCurrentPage(field.page);
    }

    // Clear any existing flash timeout (prevents overlapping animations)
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
    }

    // Start flashing the field
    setFlashingFieldName(fieldName);

    // Scroll to field after a delay if page changed (to allow page to render)
    // or immediately if on the same page
    setTimeout(
      () => {
        scrollToField();
      },
      needsPageChange ? 100 : 0
    );

    // Stop flashing after 1.5s (3 pulses × 500ms)
    flashTimeoutRef.current = setTimeout(() => {
      setFlashingFieldName(null);
      flashTimeoutRef.current = null;
    }, 1500);
  };

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

  const onDocumentLoadSuccess = (doc: pdfjs.PDFDocumentProxy) => {
    setNumPages(doc.numPages);
    setPdfDocument(doc); // Store PDF document - field extraction happens in useEffect
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
      if (downloadHandler) {
        await downloadHandler.download(sheetId);
      } else if ("downloadSheet" in apiClient) {
        const { blob, filename } = await (
          apiClient as {
            downloadSheet(
              id: string
            ): Promise<{ blob: Blob; filename: string }>;
          }
        ).downloadSheet(sheetId);
        triggerBrowserDownload(blob, filename);
      }
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
                {selectedFields.map((field) => {
                  const isHovered = hoveredFieldName === field;
                  const isFlashing = flashingFieldName === field;

                  return (
                    <div
                      className={cn(
                        "inline-flex items-center rounded-md border",
                        "border-transparent bg-secondary text-secondary-foreground",
                        "transition-all duration-200",
                        isHovered &&
                          "scale-105 transform shadow-lg ring-2 ring-blue-500",
                        isFlashing && "animate-flash"
                      )}
                      key={field}
                    >
                      <button
                        aria-label={`Navigate to field ${field}`}
                        className="cursor-pointer px-2.5 py-0.5"
                        onClick={() => handleBadgeClick(field)}
                        onMouseEnter={() => setHoveredFieldName(field)}
                        onMouseLeave={() => setHoveredFieldName(null)}
                        type="button"
                      >
                        <span className="font-semibold text-xs">{field}</span>
                      </button>
                      <button
                        aria-label={`Remove ${field}`}
                        className="px-1 py-0.5 hover:text-destructive"
                        onClick={() => handleFieldSelect(field)}
                        onMouseEnter={() => setHoveredFieldName(field)}
                        onMouseLeave={() => setHoveredFieldName(null)}
                        type="button"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardHeader>

          <Separator />

          <CardContent className="flex flex-1 flex-col items-center overflow-auto p-6">
            <div
              className="relative inline-block"
              style={{ willChange: "transform" }}
            >
              {isPdfUrlLoading && (
                <div className="flex h-[600px] w-[450px] items-center justify-center">
                  <Spinner className="h-8 w-8" />
                </div>
              )}
              {pdfUrlError && (
                <div className="flex h-[600px] w-[450px] flex-col items-center justify-center gap-2 text-destructive">
                  <AlertCircle className="h-8 w-8" />
                  <p>{pdfUrlError}</p>
                </div>
              )}
              {pdfUrl && !isPdfUrlLoading && !pdfUrlError && (
                <Document file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess}>
                  <Page
                    className="shadow-md"
                    devicePixelRatio={1}
                    pageNumber={currentPage}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                    scale={scale}
                  />
                </Document>
              )}

              {/* Overlays for current page only */}
              {currentPageFields.map((field) => (
                <FieldOverlay
                  field={field}
                  isFlashing={flashingFieldName === field.name}
                  isHovered={hoveredFieldName === field.name}
                  isSelected={selectedFields.includes(field.name)}
                  key={field.name}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  onToggle={handleFieldSelect}
                />
              ))}
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
