import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, type pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Button } from "@repo/ui/components/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card.tsx";
import { Separator } from "@repo/ui/components/separator.tsx";
import { Spinner } from "@repo/ui/components/spinner.tsx";
import { useApiClient } from "@repo/ui/context/api-client-context.tsx";
import {
  type FieldPosition,
  useFieldSnippet,
} from "@repo/ui/context/field-snippet-context.tsx";
import type { AttachedAction } from "@repo/ui/lib/api.ts";
import { getSheetFieldsCacheKey } from "@repo/ui/lib/cache.ts";
import { cn, getErrorMessage } from "@repo/ui/lib/utils.ts";
import type {
  ActionTypeMetadata,
  AttachActionRequest,
} from "@repo/ui/types/action.ts";
import {
  CalculationPanel,
  useActions,
  useCalculationBuilder,
} from "@repo/ui/views/calculation-panel.tsx";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileDown,
  RefreshCw,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import useSWR from "swr";

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = globalThis.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  globalThis.URL.revokeObjectURL(url);
}

async function exportWithHandler(
  handler: ExportStrategy,
  sheetId: string,
  t: (key: string) => string
) {
  const savedPath = await handler.export(sheetId);
  if (!savedPath) {
    return;
  }
  if (handler.revealInFolder) {
    toast.success(t("viewer.sheetExportedSuccessfully"), {
      description: t("viewer.exportViewerHint"),
      action: {
        label: t("sidebar.showInFolder"),
        onClick: () => {
          handler.revealInFolder?.(savedPath);
        },
      },
    });
  } else {
    toast.success(t("viewer.sheetExportedSuccessfully"), {
      description: t("viewer.exportViewerHint"),
    });
  }
}

async function exportWithDownload(
  apiClient: {
    downloadSheet(id: string): Promise<{ blob: Blob; filename: string }>;
  },
  sheetId: string,
  t: (key: string) => string
) {
  const { blob, filename } = await apiClient.downloadSheet(sheetId);
  triggerBrowserDownload(blob, filename);
  toast.success(t("viewer.sheetExportedSuccessfully"), {
    description: t("viewer.exportViewerHint"),
  });
}

interface SheetErrorStateProps {
  description: string;
  onRetry?: () => void;
  title: string;
}

function SheetErrorState({
  title,
  description,
  onRetry,
}: Readonly<SheetErrorStateProps>) {
  const { t } = useTranslation("common");

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md text-center" role="alert">
        <AlertCircle
          aria-hidden="true"
          className="mx-auto mb-4 h-10 w-10 text-destructive"
        />
        <h2 className="font-semibold text-lg">{title}</h2>
        <p className="mt-2 text-muted-foreground text-sm">{description}</p>
        {onRetry && (
          <Button className="mt-6" onClick={onRetry} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("tryAgain")}
          </Button>
        )}
      </div>
    </div>
  );
}

export interface PdfLoadStrategy {
  loadPdfUrl(fileRef: string): Promise<string>;
}

export interface ExportStrategy {
  export(sheetId: string): Promise<string | null>;
  revealInFolder?(path: string): Promise<void>;
}

/**
 * pick: a step is waiting for a click; edit: the field has a calculation to
 * open; static: nothing happens on click, so it isn't a button.
 */
type OverlayMode = "pick" | "edit" | "static";

interface FieldOverlayProps {
  badge: number | null;
  field: FieldPosition;
  hasCalculation: boolean;
  isFlashing: boolean;
  isHighlighted: boolean;
  label: string;
  mode: OverlayMode;
  onClick: (name: string) => void;
}

const FieldOverlay = memo(function FieldOverlay({
  badge,
  field,
  hasCalculation,
  isFlashing,
  isHighlighted,
  label,
  mode,
  onClick,
}: FieldOverlayProps) {
  const handleClick = useCallback(
    () => onClick(field.name),
    [onClick, field.name]
  );
  const marked = badge !== null || isHighlighted;
  const className = cn(
    "group absolute box-border rounded-sm border-2",
    marked && "z-20 border-primary bg-primary/25 shadow-lg",
    !marked &&
      mode === "pick" &&
      "z-10 border-primary/70 border-dashed bg-primary/5 hover:border-solid hover:bg-primary/20",
    !marked &&
      mode !== "pick" &&
      "z-10 border-yellow-400/50 bg-yellow-400/10 hover:border-yellow-400 hover:bg-yellow-400/30",
    mode !== "static" &&
      "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
    isFlashing && "z-30 animate-flash"
  );
  const style = {
    left: `${field.bounds.left}px`,
    top: `${field.bounds.top}px`,
    width: `${field.bounds.width}px`,
    height: `${field.bounds.height}px`,
  };
  const content = (
    <>
      {badge !== null && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-2.5 -left-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary font-semibold text-[11px] text-primary-foreground"
        >
          {badge}
        </span>
      )}
      {hasCalculation && badge === null && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-1 -right-1 h-2 w-2 rounded-full border border-background bg-primary"
        />
      )}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-full left-0 z-40 mb-1 hidden whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 font-mono text-[11px] text-background group-hover:block group-focus-visible:block"
      >
        {field.name}
      </span>
    </>
  );

  if (mode === "static") {
    return (
      <div className={className} data-field-name={field.name} style={style}>
        {content}
      </div>
    );
  }
  return (
    <button
      aria-label={label}
      className={className}
      data-field-name={field.name}
      onClick={handleClick}
      style={style}
      type="button"
    >
      {content}
    </button>
  );
});

interface SheetViewerProps {
  exportHandler?: ExportStrategy;
  file?: string;
  pdfLoader?: PdfLoadStrategy;
  sheetId?: string;
}

export default function SheetViewer({
  file,
  sheetId,
  pdfLoader,
  exportHandler,
}: Readonly<SheetViewerProps>) {
  const { t } = useTranslation("sheets");
  const { t: tActions } = useTranslation("actions");
  const apiClient = useApiClient();
  const [actionTypes, setActionTypes] = useState<ActionTypeMetadata[]>([]);
  const [actionTypesStatus, setActionTypesStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const actions = useActions(actionTypes);
  const builder = useCalculationBuilder(actions);

  useEffect(() => {
    let cancelled = false;
    apiClient.getActionTypes().then(
      (types) => {
        if (!cancelled) {
          setActionTypes(types);
          setActionTypesStatus("ready");
        }
      },
      (err) => {
        if (!cancelled) {
          setActionTypesStatus("error");
          toast.error(
            tActions("failedToLoadCalculationTypes", {
              message: getErrorMessage(err, t("common:unknownError")),
            })
          );
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [apiClient, t, tActions]);
  const scale = 1;
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [fieldPositions, setFieldPositions] = useState<FieldPosition[]>([]);
  const [pdfDocument, setPdfDocument] = useState<pdfjs.PDFDocumentProxy | null>(
    null
  );
  const [attachedActions, setAttachedActions] = useState<AttachedAction[]>([]);
  const [isAttaching, setIsAttaching] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  // State for pre-signed PDF URL
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isPdfUrlLoading, setIsPdfUrlLoading] = useState(false);
  const [pdfUrlError, setPdfUrlError] = useState<string | null>(null);
  // Hover from the panel, mirrored on the sheet
  const [hoveredFieldName, setHoveredFieldName] = useState<string | null>(null);
  const [flashingFieldName, setFlashingFieldName] = useState<string | null>(
    null
  );
  const [hoveredActionIndex, setHoveredActionIndex] = useState<number | null>(
    null
  );

  const highlightedFields = useMemo(() => {
    const set = new Set<string>();
    if (hoveredFieldName) {
      set.add(hoveredFieldName);
    }
    const action =
      hoveredActionIndex === null
        ? undefined
        : attachedActions[hoveredActionIndex];
    for (const field of Object.values(action?.mapping ?? {})) {
      set.add(field);
    }
    return set;
  }, [hoveredFieldName, hoveredActionIndex, attachedActions]);

  const calculationByTarget = useMemo(
    () => new Map(attachedActions.map((a) => [a.targetField, a])),
    [attachedActions]
  );

  // Step number per picked field, shown as a badge on the sheet
  const stepBadges = useMemo(() => {
    const badges = new Map<string, number>();
    if (builder.state.status !== "building") {
      return badges;
    }
    const { picks } = builder.state;
    builder.roles.forEach((role, index) => {
      const field = picks[role.key];
      if (field) {
        badges.set(field, index + 1);
      }
    });
    return badges;
  }, [builder.state, builder.roles]);

  // Ref to manage flash timeout (prevents memory leaks)
  const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { pick, edit, stopPicking, pickingRole } = builder;
  const handleFieldClick = useCallback(
    (fieldName: string) => {
      if (pickingRole) {
        pick(fieldName);
        return;
      }
      const attached = calculationByTarget.get(fieldName);
      if (attached) {
        edit(attached);
      }
    },
    [pickingRole, pick, edit, calculationByTarget]
  );

  // Esc leaves pick mode, like other canvas tools
  useEffect(() => {
    if (!pickingRole) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        stopPicking();
      }
    };
    globalThis.addEventListener("keydown", onKeyDown);
    return () => globalThis.removeEventListener("keydown", onKeyDown);
  }, [pickingRole, stopPicking]);

  const {
    setFieldPositions: setFieldSnippetPositions,
    setPdfDocument: setFieldSnippetPdfDocument,
  } = useFieldSnippet();

  // Fetch sheet fields data
  const cacheKey = sheetId ? getSheetFieldsCacheKey(sheetId) : null;

  const { data, error, mutate } = useSWR(
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

  // Hydrate attached actions from backend
  useEffect(() => {
    if (!sheetId) {
      return;
    }

    let cancelled = false;
    apiClient.listAttachedActions(sheetId).then(
      (actions) => {
        if (!cancelled) {
          setAttachedActions(actions);
        }
      },
      (err) => {
        if (!cancelled) {
          toast.error(
            tActions("failedToLoadAttachedCalculations", {
              message: getErrorMessage(err, t("common:unknownError")),
            })
          );
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [sheetId, apiClient, t, tActions]);

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
              .catch(() => ({ message: t("common:unknownError") }));
            throw new Error(
              errorData.message ?? t("viewer.failedToFetchPdfUrl")
            );
          }

          const data = await response.json();
          setPdfUrl(data.url);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t("viewer.failedToLoadPdf");
        // Shown inline in the viewer; a toast would report the same failure twice.
        setPdfUrlError(message);
      } finally {
        setIsPdfUrlLoading(false);
      }
    };

    fetchPdfUrl();
  }, [file, pdfLoader, t]);

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

  const navigateToField = (fieldName: string) => {
    const field = fieldPositions.find((f) => f.name === fieldName);
    if (!field) {
      return;
    }

    const scrollToField = () => {
      const fieldElement = document.querySelector(
        `[data-field-name="${CSS.escape(fieldName)}"]`
      );
      if (fieldElement) {
        const prefersReducedMotion = globalThis.matchMedia?.(
          "(prefers-reduced-motion: reduce)"
        ).matches;
        fieldElement.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "center",
          inline: "center",
        });
      }
    };

    const needsPageChange = field.page !== currentPage;
    if (needsPageChange) {
      setCurrentPage(field.page);
    }

    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
    }
    setFlashingFieldName(fieldName);

    // Give a new page a moment to render before scrolling to the field
    setTimeout(scrollToField, needsPageChange ? 100 : 0);

    // Stop flashing after 1.5s (3 pulses × 500ms)
    flashTimeoutRef.current = setTimeout(() => {
      setFlashingFieldName(null);
      flashTimeoutRef.current = null;
    }, 1500);
  };

  if (error) {
    if (error.statusCode === 404) {
      return (
        <SheetErrorState
          description={t("viewer.sheetNotFoundDescription")}
          title={t("viewer.sheetNotFound")}
        />
      );
    }
    return (
      <SheetErrorState
        description={t("viewer.errorWithCode", {
          code: error.statusCode ?? "?",
          message: getErrorMessage(error, t("common:unknownError")),
        })}
        onRetry={() => mutate()}
        title={t("viewer.couldNotLoadSheet")}
      />
    );
  }

  const currentPageFields = fieldPositions.filter(
    (f) => f.page === currentPage
  );

  const onDocumentLoadSuccess = (doc: pdfjs.PDFDocumentProxy) => {
    setNumPages(doc.numPages);
    setPdfDocument(doc); // Store PDF document - field extraction happens in useEffect
  };

  const handleAttach = async () => {
    const { state, action } = builder;
    if (state.status !== "building" || !action) {
      return;
    }
    if (!sheetId) {
      toast.error(t("viewer.noSheetIdAvailable"));
      return;
    }

    const meta = actionTypes.find((at) => at.id === action.id);
    const request: AttachActionRequest = {
      actionLabel: meta?.actionLabel ?? action.id,
      mapping: state.picks,
    };

    setIsAttaching(true);
    try {
      await apiClient.attachAction(sheetId, request);
      // Refresh from DB to get accurate state after backend upsert
      setAttachedActions(await apiClient.listAttachedActions(sheetId));
      builder.attached();
      const target = action.roles.find((r) => r.isTarget);
      toast.success(
        t("viewer.attachedSuccessfully", {
          name: action.name,
          field: target ? state.picks[target.key] : "",
        })
      );
    } catch (err) {
      toast.error(
        t("viewer.failedToAttach", {
          name: action.name,
          message: getErrorMessage(err, t("common:unknownError")),
        })
      );
    } finally {
      setIsAttaching(false);
    }
  };

  const handleExportSheet = async () => {
    if (!sheetId) {
      return;
    }

    setIsExporting(true);

    try {
      if (exportHandler) {
        await exportWithHandler(exportHandler, sheetId, t);
      } else if ("downloadSheet" in apiClient) {
        await exportWithDownload(
          apiClient as Parameters<typeof exportWithDownload>[0],
          sheetId,
          t
        );
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err, t("common:unknownError"));
      toast.error(t("viewer.failedToExportSheet", { message: errorMessage }));
    } finally {
      setIsExporting(false);
    }
  };

  const overlayMode = (fieldName: string): OverlayMode => {
    if (pickingRole) {
      return "pick";
    }
    if (builder.state.status === "idle" && calculationByTarget.has(fieldName)) {
      return "edit";
    }
    return "static";
  };

  const overlayLabel = (fieldName: string, mode: OverlayMode) => {
    if (mode === "pick") {
      return t("viewer.pickField", { field: fieldName });
    }
    const attached = calculationByTarget.get(fieldName);
    const action = actions.find((a) => a.id === attached?.id);
    return tActions("editCalculation", {
      name: action?.name ?? attached?.name ?? "",
      field: fieldName,
    });
  };

  const stepIndex =
    pickingRole === undefined ? -1 : builder.roles.indexOf(pickingRole);

  return (
    <div className="flex flex-col bg-background lg:h-full lg:min-h-0 lg:flex-row">
      {/* PDF viewer with overlays */}
      <div className="flex min-h-0 flex-1 flex-col p-6">
        <Card className="flex flex-1 flex-col overflow-hidden">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl">
                  {t("viewer.characterSheetEditor")}
                </CardTitle>
                <CardDescription>{t("viewer.editorHint")}</CardDescription>
              </div>
              <Button
                disabled={isExporting || !sheetId}
                onClick={handleExportSheet}
                size="sm"
                variant="outline"
              >
                <FileDown className="mr-2 h-4 w-4" />
                {isExporting ? t("viewer.exporting") : t("viewer.export")}
              </Button>
            </div>
          </CardHeader>

          <Separator />

          <div className="relative flex min-h-0 flex-1 flex-col">
            <div aria-live="polite" className="sr-only">
              {pickingRole
                ? tActions("clickTheField", { role: pickingRole.label })
                : ""}
            </div>
            {pickingRole && (
              <div className="fixed bottom-6 left-1/2 z-40 flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-2xl bg-foreground py-1.5 pr-1.5 pl-4 text-background shadow-lg lg:absolute lg:top-3 lg:bottom-auto lg:flex-nowrap lg:whitespace-nowrap lg:rounded-full">
                <span className="text-background/70 text-xs">
                  {tActions("stepOf", {
                    current: stepIndex + 1,
                    total: builder.roles.length,
                  })}
                </span>
                <span className="font-medium text-sm">
                  {tActions("clickTheField", { role: pickingRole.label })}
                </span>
                {!pickingRole.required && (
                  <button
                    className="h-7 rounded-full border border-background/40 px-3 text-xs hover:bg-background/10"
                    onClick={builder.skip}
                    type="button"
                  >
                    {tActions("skip")}
                  </button>
                )}
                <button
                  className="h-7 rounded-full bg-background/15 px-3 text-xs hover:bg-background/25"
                  onClick={builder.stopPicking}
                  type="button"
                >
                  {tActions("stopPicking")}
                </button>
              </div>
            )}

            <CardContent
              className={cn(
                "flex flex-1 flex-col items-center overflow-auto p-6",
                pickingRole && "lg:pt-16"
              )}
            >
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
                      pageNumber={currentPage}
                      renderAnnotationLayer={false}
                      renderTextLayer={false}
                      scale={scale}
                    />
                  </Document>
                )}

                {/* Overlays for current page only */}
                {currentPageFields.map((field) => {
                  const mode = overlayMode(field.name);
                  return (
                    <FieldOverlay
                      badge={stepBadges.get(field.name) ?? null}
                      field={field}
                      hasCalculation={calculationByTarget.has(field.name)}
                      isFlashing={flashingFieldName === field.name}
                      isHighlighted={highlightedFields.has(field.name)}
                      key={field.name}
                      label={overlayLabel(field.name, mode)}
                      mode={mode}
                      onClick={handleFieldClick}
                    />
                  );
                })}
              </div>
            </CardContent>
          </div>

          {/* Pagination controls */}
          <div className="flex items-center justify-center gap-4 border-t p-4">
            <Button
              disabled={currentPage <= 1}
              onClick={previousPage}
              size="sm"
              variant="outline"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              {t("viewer.previous")}
            </Button>
            <span className="font-medium text-sm">
              {t("viewer.pageOf", {
                current: currentPage,
                total: numPages || "…",
              })}
            </span>
            <Button
              disabled={currentPage >= (numPages || 1)}
              onClick={nextPage}
              size="sm"
              variant="outline"
            >
              {t("viewer.next")}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>

      {/* Calculations panel */}
      <div className="shrink-0 p-6 pt-0 lg:w-96 lg:pt-6 lg:pl-0">
        <Card className="flex flex-col lg:h-full">
          <div className="p-6 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            <CalculationPanel
              actions={actions}
              actionTypesStatus={actionTypesStatus}
              attachedActions={attachedActions}
              builder={builder}
              hoveredCalculation={hoveredActionIndex}
              isAttaching={isAttaching}
              onAttach={handleAttach}
              onFieldHover={setHoveredFieldName}
              onHoverCalculation={setHoveredActionIndex}
              onNavigateToField={navigateToField}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
