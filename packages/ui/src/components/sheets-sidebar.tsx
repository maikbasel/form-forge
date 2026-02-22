"use client";

import { cn } from "@repo/ui/lib/utils";
import {
  ExternalLink,
  Eye,
  FileText,
  FolderOpen,
  Settings,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "./context-menu.tsx";
import { ScrollArea } from "./scroll-area.tsx";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "./sidebar.tsx";

export interface SheetSummary {
  id: string;
  originalName: string;
  createdAt?: string;
  storedPath?: string;
}

interface SheetsSidebarProps {
  sheets: SheetSummary[];
  currentSheetId?: string;
  onSelectSheet: (id: string) => void;
  onOpenFolder?: () => void;
  onOpenSettings?: () => void;
  onGoHome?: () => void;
  onOpenInFolder?: (id: string) => void;
  onOpenPdf?: (id: string) => void;
}

type DateGroup = "Today" | "Yesterday" | "Previous 7 days" | "Older";

function getDateGroup(createdAt: string): DateGroup {
  const date = new Date(createdAt.replace(" ", "T").concat("Z"));
  const now = new Date();

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOf7DaysAgo = new Date(startOfToday);
  startOf7DaysAgo.setDate(startOf7DaysAgo.getDate() - 6);

  if (date >= startOfToday) {
    return "Today";
  }
  if (date >= startOfYesterday) {
    return "Yesterday";
  }
  if (date >= startOf7DaysAgo) {
    return "Previous 7 days";
  }
  return "Older";
}

function groupSheets(
  sheets: SheetSummary[]
): Array<{ label: DateGroup; sheets: SheetSummary[] }> {
  const groups: Array<{ label: DateGroup; sheets: SheetSummary[] }> = [];
  let currentGroup: DateGroup | undefined;

  for (const sheet of sheets) {
    const group = sheet.createdAt ? getDateGroup(sheet.createdAt) : "Older";
    if (group !== currentGroup) {
      currentGroup = group;
      groups.push({ label: group, sheets: [] });
    }
    groups.at(-1)?.sheets.push(sheet);
  }

  return groups;
}

function formatDate(createdAt: string): string {
  const date = new Date(createdAt.replace(" ", "T").concat("Z"));
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function SheetItem({
  sheet,
  isActive,
  onSelectSheet,
  onOpenPdf,
  onOpenInFolder,
}: {
  sheet: SheetSummary;
  isActive: boolean;
  onSelectSheet: (id: string) => void;
  onOpenPdf?: (id: string) => void;
  onOpenInFolder?: (id: string) => void;
}) {
  return (
    <SidebarMenuItem>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <SidebarMenuButton
            className={cn(
              "flex h-auto flex-col items-start gap-0.5 py-2",
              isActive && "bg-accent"
            )}
            onClick={() => onSelectSheet(sheet.id)}
            tooltip={sheet.originalName}
          >
            <div className="flex w-full items-center gap-2">
              <FileText className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate font-medium text-sm">
                {sheet.originalName}
              </span>
            </div>
            {sheet.createdAt && (
              <span className="pl-5 text-muted-foreground text-xs">
                {formatDate(sheet.createdAt)}
              </span>
            )}
          </SidebarMenuButton>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => onSelectSheet(sheet.id)}>
            <Eye className="mr-2 size-4" />
            Open
          </ContextMenuItem>
          {(onOpenPdf ?? onOpenInFolder) && <ContextMenuSeparator />}
          {onOpenPdf && (
            <ContextMenuItem onClick={() => onOpenPdf(sheet.id)}>
              <ExternalLink className="mr-2 size-4" />
              Open with default app
            </ContextMenuItem>
          )}
          {onOpenInFolder && (
            <ContextMenuItem onClick={() => onOpenInFolder(sheet.id)}>
              <FolderOpen className="mr-2 size-4" />
              Show in folder
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>
    </SidebarMenuItem>
  );
}

export function SheetsSidebar({
  sheets,
  currentSheetId,
  onSelectSheet,
  onOpenFolder,
  onOpenSettings,
  onGoHome,
  onOpenInFolder,
  onOpenPdf,
}: SheetsSidebarProps) {
  const groups = groupSheets(sheets);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b px-2 py-2">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          {onGoHome ? (
            <button
              className="font-semibold text-sm tracking-tight transition-opacity hover:opacity-70 group-data-[collapsible=icon]:hidden"
              onClick={onGoHome}
              type="button"
            >
              Form Forge
            </button>
          ) : (
            <span className="font-semibold text-sm tracking-tight group-data-[collapsible=icon]:hidden">
              Form Forge
            </span>
          )}
          {onOpenFolder && (
            <SidebarMenuButton
              aria-label="Open storage folder"
              className="ml-auto size-8 group-data-[collapsible=icon]:hidden"
              onClick={onOpenFolder}
              size="sm"
              tooltip="Open storage folder"
            >
              <FolderOpen className="size-4" />
            </SidebarMenuButton>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="p-0">
        <ScrollArea className="flex-1">
          {sheets.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground text-xs group-data-[collapsible=icon]:hidden">
              No sheets yet.
              <br />
              Open a PDF to get started.
            </div>
          ) : (
            groups.map((group) => (
              <SidebarGroup className="py-0" key={group.label}>
                <SidebarGroupLabel className="px-3 text-muted-foreground text-xs">
                  {group.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="px-1">
                    {group.sheets.map((sheet) => (
                      <SheetItem
                        isActive={currentSheetId === sheet.id}
                        key={sheet.id}
                        onOpenInFolder={onOpenInFolder}
                        onOpenPdf={onOpenPdf}
                        onSelectSheet={onSelectSheet}
                        sheet={sheet}
                      />
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))
          )}
        </ScrollArea>
      </SidebarContent>

      {onOpenSettings && (
        <SidebarFooter className="border-t p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={onOpenSettings} tooltip="Settings">
                <Settings className="size-4 shrink-0" />
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
