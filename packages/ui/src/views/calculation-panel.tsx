import { Badge } from "@repo/ui/components/badge.tsx";
import { Button } from "@repo/ui/components/button.tsx";
import { FieldSnippet } from "@repo/ui/components/field-snippet.tsx";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@repo/ui/components/hover-card.tsx";
import { Skeleton } from "@repo/ui/components/skeleton.tsx";
import { Spinner } from "@repo/ui/components/spinner.tsx";
import type { AttachedAction } from "@repo/ui/lib/api.ts";
import { cn } from "@repo/ui/lib/utils.ts";
import type { ActionTypeMetadata } from "@repo/ui/types/action.ts";
import { AlertTriangle, Check, Lock, Pencil, Pin, Plus, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export interface FieldRole {
  hint: string;
  isTarget: boolean;
  key: string;
  label: string;
  required: boolean;
}

export interface ActionConfig {
  description: string;
  id: string;
  name: string;
  /** Result field first, then the inputs in the backend's order. */
  roles: FieldRole[];
}

export function useActions(actionTypes: ActionTypeMetadata[]): ActionConfig[] {
  const { t } = useTranslation("actions");

  return useMemo(
    () =>
      actionTypes.map((meta) => ({
        id: meta.id,
        name: t(`${meta.id}.name`, { defaultValue: meta.id }),
        description: t(`${meta.id}.description`, { defaultValue: "" }),
        roles: meta.roles
          .map((role) => ({
            key: role.key,
            label: t(`${meta.id}.roles.${role.key}.label`, {
              defaultValue: role.key,
            }),
            required: role.required,
            hint: t(`${meta.id}.roles.${role.key}.hint`, { defaultValue: "" }),
            isTarget: role.isTarget,
          }))
          .sort((a, b) => Number(b.isTarget) - Number(a.isTarget)),
      })),
    [actionTypes, t]
  );
}

// ---------------------------------------------------------------------------
// Builder state
// ---------------------------------------------------------------------------

type Picks = Record<string, string>;

export type BuilderState =
  | { status: "idle" }
  | { status: "choosing" }
  | {
      status: "building";
      actionId: string;
      /** Index into the action's roles, or -1 when no step is waiting for a click. */
      active: number;
      attachedCount: number;
      /** Result field of the calculation being edited; locked while editing. */
      editingTarget: string | null;
      picks: Picks;
      skipped: Record<string, boolean>;
    };

function nextOpenStep(
  roles: FieldRole[],
  picks: Picks,
  skipped: Record<string, boolean>,
  from: number
): number {
  for (let n = 1; n <= roles.length; n++) {
    const index = (from + n) % roles.length;
    const role = roles[index];
    if (role && !(picks[role.key] || skipped[role.key])) {
      return index;
    }
  }
  return -1;
}

/** State and transitions for building one calculation at a time. */
export function useCalculationBuilder(actions: ActionConfig[]) {
  const [state, setState] = useState<BuilderState>({ status: "idle" });
  // Kept fields per calculation type, remembered while the editor is open.
  const [pinned, setPinned] = useState<Record<string, Record<string, boolean>>>(
    {}
  );

  const action =
    state.status === "building"
      ? actions.find((a) => a.id === state.actionId)
      : undefined;
  const roles = action?.roles ?? [];
  const activeRole =
    state.status === "building" && state.active >= 0
      ? roles[state.active]
      : undefined;
  const isLocked = (role: FieldRole) =>
    state.status === "building" && !!state.editingTarget && role.isTarget;
  const pickingRole =
    activeRole && !isLocked(activeRole) ? activeRole : undefined;

  const start = useCallback(() => setState({ status: "choosing" }), []);
  const cancel = useCallback(() => setState({ status: "idle" }), []);

  const choose = useCallback(
    (actionId: string) => {
      const chosen = actions.find((a) => a.id === actionId);
      if (!chosen) {
        return;
      }
      const keep: Picks = {};
      setState({
        status: "building",
        actionId,
        picks: keep,
        skipped: {},
        active: nextOpenStep(chosen.roles, keep, {}, -1),
        editingTarget: null,
        attachedCount: 0,
      });
    },
    [actions]
  );

  const edit = useCallback(
    (attached: AttachedAction) => {
      if (!actions.some((a) => a.id === attached.id)) {
        return;
      }
      setState({
        status: "building",
        actionId: attached.id,
        picks: { ...attached.mapping },
        skipped: {},
        active: -1,
        editingTarget: attached.targetField,
        attachedCount: 0,
      });
    },
    [actions]
  );

  const pick = (fieldName: string) => {
    if (state.status !== "building" || !pickingRole) {
      return;
    }
    const picks: Picks = {};
    for (const [key, value] of Object.entries(state.picks)) {
      if (value !== fieldName) {
        picks[key] = value;
      }
    }
    picks[pickingRole.key] = fieldName;
    const skipped = { ...state.skipped, [pickingRole.key]: false };
    setState({
      ...state,
      picks,
      skipped,
      active: nextOpenStep(roles, picks, skipped, state.active),
    });
  };

  const activate = (index: number) => {
    const role = roles[index];
    if (state.status !== "building" || !role || isLocked(role)) {
      return;
    }
    setState({ ...state, active: index });
  };

  const skip = () => {
    if (state.status !== "building" || !pickingRole || pickingRole.required) {
      return;
    }
    const picks = { ...state.picks };
    delete picks[pickingRole.key];
    const skipped = { ...state.skipped, [pickingRole.key]: true };
    setState({
      ...state,
      picks,
      skipped,
      active: nextOpenStep(roles, picks, skipped, state.active),
    });
  };

  const stopPicking = () => {
    if (state.status === "building") {
      setState({ ...state, active: -1 });
    }
  };

  const togglePin = (roleKey: string) => {
    if (state.status !== "building") {
      return;
    }
    const forType = pinned[state.actionId] ?? {};
    setPinned({
      ...pinned,
      [state.actionId]: { ...forType, [roleKey]: !forType[roleKey] },
    });
  };

  /** Call after a successful attach: editing closes, a new one starts over. */
  const attached = () => {
    if (state.status !== "building") {
      return;
    }
    if (state.editingTarget) {
      setState({ status: "idle" });
      return;
    }
    const forType = pinned[state.actionId] ?? {};
    const keep: Picks = {};
    for (const role of roles) {
      const field = state.picks[role.key];
      if (!role.isTarget && forType[role.key] && field) {
        keep[role.key] = field;
      }
    }
    setState({
      ...state,
      picks: keep,
      skipped: {},
      active: nextOpenStep(roles, keep, {}, -1),
      attachedCount: state.attachedCount + 1,
    });
  };

  const picks = state.status === "building" ? state.picks : {};
  const isReady = !!action && roles.every((r) => !r.required || !!picks[r.key]);

  return {
    state,
    action,
    roles,
    pickingRole,
    pinned: state.status === "building" ? (pinned[state.actionId] ?? {}) : {},
    isReady,
    isLocked,
    start,
    cancel,
    choose,
    edit,
    pick,
    activate,
    skip,
    stopPicking,
    togglePin,
    attached,
  };
}

export type CalculationBuilder = ReturnType<typeof useCalculationBuilder>;

// ---------------------------------------------------------------------------
// Field name with a preview of where it sits on the sheet
// ---------------------------------------------------------------------------

interface FieldChipProps {
  field: string;
  onHover: (field: string | null) => void;
  onNavigate: (field: string) => void;
}

export function FieldChip({
  field,
  onHover,
  onNavigate,
}: Readonly<FieldChipProps>) {
  const { t } = useTranslation("sheets");
  return (
    <HoverCard closeDelay={100} openDelay={300}>
      <HoverCardTrigger asChild>
        <button
          aria-label={t("viewer.navigateToField", { field })}
          className="max-w-full truncate rounded border border-border bg-background px-1.5 py-0.5 text-left font-mono text-foreground text-xs hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onBlur={() => onHover(null)}
          onClick={() => onNavigate(field)}
          onFocus={() => onHover(field)}
          onMouseEnter={() => onHover(field)}
          onMouseLeave={() => onHover(null)}
          type="button"
        >
          {field}
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-80" side="left">
        <FieldSnippet fieldName={field} />
      </HoverCardContent>
    </HoverCard>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

interface CalculationPanelProps {
  actions: ActionConfig[];
  actionTypesStatus: "loading" | "ready" | "error";
  attachedActions: AttachedAction[];
  builder: CalculationBuilder;
  hoveredCalculation: number | null;
  isAttaching: boolean;
  onAttach: () => void;
  onFieldHover: (field: string | null) => void;
  onHoverCalculation: (index: number | null) => void;
  onNavigateToField: (field: string) => void;
}

export function CalculationPanel(props: Readonly<CalculationPanelProps>) {
  const { builder } = props;
  if (builder.state.status === "choosing") {
    return <TypePicker {...props} />;
  }
  if (builder.state.status === "building" && builder.action) {
    return <StepList {...props} />;
  }
  return <CalculationList {...props} />;
}

function PanelHeader({
  title,
  subtitle,
  onClose,
  children,
}: Readonly<{
  children?: React.ReactNode;
  onClose?: () => void;
  subtitle?: React.ReactNode;
  title: string;
}>) {
  const { t } = useTranslation("common");
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 space-y-0.5">
        <h2 className="font-semibold text-lg leading-tight">{title}</h2>
        {subtitle && (
          <div className="text-muted-foreground text-sm">{subtitle}</div>
        )}
        {children}
      </div>
      {onClose && (
        <Button
          aria-label={t("close")}
          className="h-8 w-8 shrink-0"
          onClick={onClose}
          size="icon"
          variant="ghost"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

function CalculationList({
  actions,
  actionTypesStatus,
  attachedActions,
  builder,
  hoveredCalculation,
  onFieldHover,
  onHoverCalculation,
  onNavigateToField,
}: Readonly<CalculationPanelProps>) {
  const { t } = useTranslation("actions");

  return (
    <div className="flex flex-col gap-4">
      <PanelHeader
        subtitle={t("calculationsConfigured", {
          count: attachedActions.length,
        })}
        title={t("panelTitle")}
      />
      <Button
        className="h-11"
        disabled={actionTypesStatus === "error"}
        onClick={builder.start}
      >
        <Plus className="mr-2 h-4 w-4" />
        {t("newCalculation")}
      </Button>

      {attachedActions.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="font-medium text-sm">{t("noActionsConfiguredYet")}</p>
          <p className="mt-1 text-muted-foreground text-sm">{t("emptyHint")}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {attachedActions.map((attached, index) => {
            const action = actions.find((a) => a.id === attached.id);
            const key = `${attached.id.toLowerCase()}-${attached.targetField}`;

            if (!action && actionTypesStatus === "loading") {
              return (
                <li key={key}>
                  <Skeleton aria-busy="true" className="h-24 w-full" />
                </li>
              );
            }

            if (!action) {
              return (
                <li
                  className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-muted/50 p-4"
                  key={key}
                >
                  <AlertTriangle
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
                  />
                  <div className="min-w-0 space-y-1">
                    <div className="font-semibold text-sm">
                      {t("unsupportedCalculation")}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {t("unsupportedCalculationDescription")}
                    </p>
                    <Badge className="font-mono text-xs" variant="outline">
                      {attached.targetField}
                    </Badge>
                  </div>
                </li>
              );
            }

            return (
              // biome-ignore lint/a11y/noNoninteractiveElementInteractions: hover only mirrors the card's fields on the sheet; the field chips give keyboard users the same highlight on focus.
              <li
                className={cn(
                  "rounded-lg border bg-background p-4 transition-colors",
                  hoveredCalculation === index && "border-primary"
                )}
                key={key}
                onMouseEnter={() => onHoverCalculation(index)}
                onMouseLeave={() => onHoverCalculation(null)}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-sm">{action.name}</h3>
                  <Button
                    aria-label={t("editCalculation", {
                      name: action.name,
                      field: attached.targetField,
                    })}
                    className="h-8"
                    onClick={() => builder.edit(attached)}
                    size="sm"
                    variant="outline"
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    {t("edit")}
                  </Button>
                </div>
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 text-xs">
                  {action.roles
                    .filter((role) => attached.mapping[role.key])
                    .map((role) => (
                      <div className="contents" key={role.key}>
                        <dt className="text-muted-foreground">{role.label}</dt>
                        <dd className="flex justify-end">
                          <FieldChip
                            field={attached.mapping[role.key] ?? ""}
                            onHover={onFieldHover}
                            onNavigate={onNavigateToField}
                          />
                        </dd>
                      </div>
                    ))}
                </dl>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function TypePicker({
  actions,
  actionTypesStatus,
  attachedActions,
  builder,
}: Readonly<CalculationPanelProps>) {
  const { t } = useTranslation("actions");

  return (
    <div className="flex flex-col gap-4">
      <PanelHeader
        onClose={builder.cancel}
        subtitle={t("whatToCalculate")}
        title={t("newCalculation")}
      />
      {actionTypesStatus === "loading" && (
        <div aria-busy="true" className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}
      {actionTypesStatus === "error" && (
        <p className="text-destructive text-sm" role="alert">
          {t("typesUnavailable")}
        </p>
      )}
      {actions.map((action) => {
        const count = attachedActions.filter((a) => a.id === action.id).length;
        return (
          <button
            className="flex flex-col items-start gap-1 rounded-lg border bg-background p-4 text-left transition-colors hover:border-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            key={action.id}
            onClick={() => builder.choose(action.id)}
            type="button"
          >
            <span className="font-semibold text-sm">{action.name}</span>
            <span className="text-muted-foreground text-xs">
              {action.description}
            </span>
            <span className="text-muted-foreground text-xs">
              {count > 0
                ? t("attachedOnSheet", { count })
                : t("noneAttachedYet")}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function StepList({
  attachedActions,
  builder,
  isAttaching,
  onAttach,
  onFieldHover,
  onNavigateToField,
}: Readonly<CalculationPanelProps>) {
  const { t } = useTranslation("actions");
  const { state, action, roles, isReady } = builder;
  if (state.status !== "building" || !action) {
    return null;
  }
  const editing = !!state.editingTarget;
  const targetRole = roles.find((r) => r.isTarget);
  const targetField = targetRole ? state.picks[targetRole.key] : undefined;
  const replaced =
    targetField && !editing
      ? attachedActions.find((a) => a.targetField === targetField)
      : undefined;

  let closeLabel = t("common:cancel");
  if (!editing && state.attachedCount > 0) {
    closeLabel = t("done");
  }
  let attachLabel = editing ? t("saveChanges") : t("attachCalculation");
  if (isAttaching) {
    attachLabel = t("attaching");
  }

  return (
    <div className="flex flex-col gap-4">
      <PanelHeader
        onClose={isAttaching ? undefined : builder.cancel}
        subtitle={
          editing
            ? t("editingResult", { field: state.editingTarget })
            : undefined
        }
        title={action.name}
      >
        {!editing && (
          <button
            className="text-primary text-sm underline-offset-4 hover:underline"
            disabled={isAttaching}
            onClick={builder.start}
            type="button"
          >
            {t("changeType")}
          </button>
        )}
      </PanelHeader>

      <ol className="flex flex-col gap-1">
        {roles.map((role, index) => (
          <StepRow
            builder={builder}
            index={index}
            isAttaching={isAttaching}
            key={role.key}
            onFieldHover={onFieldHover}
            onNavigateToField={onNavigateToField}
            role={role}
          />
        ))}
      </ol>

      {replaced && (
        <output className="flex items-start gap-2 rounded-md bg-amber-500/15 p-3 text-amber-900 text-xs dark:text-amber-200">
          <AlertTriangle
            aria-hidden="true"
            className="mt-0.5 h-3.5 w-3.5 shrink-0"
          />
          {t("replacesExisting", {
            field: replaced.targetField,
            name: t(`${replaced.id}.name`, { defaultValue: replaced.name }),
          })}
        </output>
      )}

      <div className="flex flex-col gap-3 border-t pt-4">
        <p className="text-muted-foreground text-xs">
          {editing ? t("footHintEditing") : t("footHint")}
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            disabled={isAttaching}
            onClick={builder.cancel}
            variant="outline"
          >
            {closeLabel}
          </Button>
          <Button disabled={!isReady || isAttaching} onClick={onAttach}>
            {isAttaching && <Spinner />}
            {attachLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface StepRowProps {
  builder: CalculationBuilder;
  index: number;
  isAttaching: boolean;
  onFieldHover: (field: string | null) => void;
  onNavigateToField: (field: string) => void;
  role: FieldRole;
}

function StepRow({
  builder,
  index,
  isAttaching,
  onFieldHover,
  onNavigateToField,
  role,
}: Readonly<StepRowProps>) {
  const { t } = useTranslation("actions");
  const { state, pickingRole, pinned } = builder;
  if (state.status !== "building") {
    return null;
  }
  const editing = !!state.editingTarget;
  const field = state.picks[role.key];
  const isActive = pickingRole?.key === role.key;
  const locked = builder.isLocked(role);
  let status = role.hint;
  if (isActive) {
    status = t("clickOnSheet");
  } else if (state.skipped[role.key]) {
    status = t("skipped");
  }

  return (
    <li
      aria-current={isActive ? "step" : undefined}
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-start rounded-lg",
        isActive && "bg-primary/10 ring-1 ring-primary"
      )}
    >
      <button
        className="flex min-w-0 flex-1 items-start gap-3 rounded-lg p-2 text-left hover:bg-muted disabled:cursor-default disabled:hover:bg-transparent"
        disabled={locked || isAttaching}
        onClick={() => builder.activate(index)}
        type="button"
      >
        <span
          aria-hidden="true"
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border font-semibold text-[11px]",
            field && "border-primary bg-primary text-primary-foreground",
            !field && isActive && "border-2 border-primary text-primary",
            !(field || isActive) && "border-border text-muted-foreground"
          )}
        >
          {field ? <Check className="h-3 w-3" /> : index + 1}
        </span>
        <span className="min-w-0 space-y-0.5">
          <span className="block font-medium text-sm">
            {role.label}
            {!role.required && (
              <span className="ml-1 font-normal text-muted-foreground">
                ({t("common:optional")})
              </span>
            )}
          </span>
          {!field && (
            <span
              className={cn(
                "block text-xs",
                isActive ? "font-medium text-primary" : "text-muted-foreground"
              )}
            >
              {status}
            </span>
          )}
        </span>
      </button>
      <div className="flex items-center gap-1 py-2 pr-2">
        {locked && (
          <Lock
            aria-label={t("lockedWhileEditing")}
            className="h-3.5 w-3.5 text-muted-foreground"
            role="img"
          />
        )}
        {!(role.isTarget || editing) && (
          <Button
            aria-pressed={!!pinned[role.key]}
            className="h-7 rounded-full px-2 text-[11px]"
            onClick={() => builder.togglePin(role.key)}
            size="sm"
            title={t("keepHint")}
            variant={pinned[role.key] ? "default" : "outline"}
          >
            <Pin className="mr-1 h-3 w-3" />
            {t("keep")}
          </Button>
        )}
      </div>
      {field && (
        <div className="col-span-2 -mt-1 min-w-0 pr-2 pb-2 pl-10">
          <FieldChip
            field={field}
            onHover={onFieldHover}
            onNavigate={onNavigateToField}
          />
        </div>
      )}
    </li>
  );
}
