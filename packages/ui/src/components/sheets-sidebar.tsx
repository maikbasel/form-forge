"use client";

import { cn } from "@repo/ui/lib/utils";
import { FileText, FolderOpen, Settings } from "lucide-react";
import { ScrollArea } from "./scroll-area.tsx";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "./sidebar.tsx";

export interface SheetSummary {
  id: string;
  originalName: string;
}

interface SheetsSidebarProps {
  sheets: SheetSummary[];
  currentSheetId?: string;
  onSelectSheet: (id: string) => void;
  onOpenNew: () => void;
  onOpenSettings?: () => void;
  onGoHome?: () => void;
}

export function SheetsSidebar({
  sheets,
  currentSheetId,
  onSelectSheet,
  onOpenNew,
  onOpenSettings,
  onGoHome,
}: SheetsSidebarProps) {
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
          <SidebarMenuButton
            aria-label="Open new sheet"
            className="ml-auto size-8 group-data-[collapsible=icon]:hidden"
            onClick={onOpenNew}
            size="sm"
            tooltip="Open new sheet"
          >
            <FolderOpen className="size-4" />
          </SidebarMenuButton>
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
            <SidebarMenu className="px-1 py-1">
              {sheets.map((sheet) => (
                <SidebarMenuItem key={sheet.id}>
                  <SidebarMenuButton
                    className={cn(
                      "flex h-auto flex-col items-start gap-0.5 py-2",
                      currentSheetId === sheet.id && "bg-accent"
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
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
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
