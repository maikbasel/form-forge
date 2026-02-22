import { SheetsSidebar } from "@repo/ui/components/sheets-sidebar";
import { useSheet } from "@repo/ui/context/sheet-context";
import { listen } from "@tauri-apps/api/event";
import { appDataDir, dirname } from "@tauri-apps/api/path";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { open } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { getExportDir } from "../lib/settings";
import {
  listSheets,
  type SheetSummary,
  uploadSheetFromPath,
} from "../lib/tauri-api-client";
import { tauriExportStrategy } from "../lib/tauri-strategies";

const PATH_SEPARATOR_REGEX = /[\\/]/;

export function AppSidebar() {
  const [sheets, setSheets] = useState<SheetSummary[]>([]);
  const navigate = useNavigate();
  const { id: currentId } = useParams<{ id: string }>();
  const { setSheetPath, setSheetId } = useSheet();

  useEffect(() => {
    listSheets().then(setSheets).catch(console.error);
  }, []);

  const handleOpenNew = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: "PDF Files", extensions: ["pdf"] }],
    });

    if (!selected) {
      return;
    }

    const fileName = selected.split(PATH_SEPARATOR_REGEX).pop() ?? "sheet.pdf";

    try {
      const ref = await uploadSheetFromPath(selected, fileName);
      setSheetPath(selected);
      setSheetId(ref.id);
      setSheets((prev) => [
        {
          id: ref.id,
          originalName: ref.original_name,
          storedPath: selected,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      navigate(`/sheets/${ref.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Import failed";
      toast.error(`Failed to import sheet: ${message}`);
    }
  };

  const handleDroppedFile = async (filePath: string) => {
    const fileName = filePath.split(PATH_SEPARATOR_REGEX).pop() ?? "sheet.pdf";

    try {
      const ref = await uploadSheetFromPath(filePath, fileName);
      setSheetPath(filePath);
      setSheetId(ref.id);
      setSheets((prev) => [
        {
          id: ref.id,
          originalName: ref.original_name,
          storedPath: filePath,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      navigate(`/sheets/${ref.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Import failed";
      toast.error(`Failed to import sheet: ${message}`);
    }
  };

  const handleOpenInFolder = async (id: string) => {
    const sheet = sheets.find((s) => s.id === id);
    if (!sheet?.storedPath) {
      return;
    }
    const folder = await dirname(sheet.storedPath);
    await openPath(folder);
  };

  const handleOpenPdf = async (id: string) => {
    const sheet = sheets.find((s) => s.id === id);
    if (!sheet?.storedPath) {
      return;
    }
    await openPath(sheet.storedPath);
  };

  const handleOpenFolder = async () => {
    const customDir = await getExportDir();
    if (customDir) {
      await openPath(customDir);
    } else {
      const dataDir = await appDataDir();
      await openPath(`${dataDir}/sheets`);
    }
  };

  // Stable refs so the single useEffect subscription always calls latest versions
  const handleOpenNewRef = useRef(handleOpenNew);
  handleOpenNewRef.current = handleOpenNew;
  const handleDroppedFileRef = useRef(handleDroppedFile);
  handleDroppedFileRef.current = handleDroppedFile;
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const currentIdRef = useRef(currentId);
  currentIdRef.current = currentId;

  useEffect(() => {
    let cancelled = false;
    const unsubs: Array<() => void> = [];

    Promise.all([
      listen("menu:open-sheet", () => {
        handleOpenNewRef.current();
      }),
      listen("menu:settings", () => {
        navigateRef.current("/settings");
      }),
      listen("menu:about", () => {
        navigateRef.current("/settings");
      }),
      listen("menu:export-sheet", () => {
        const id = currentIdRef.current;
        if (id) {
          tauriExportStrategy.export(id).catch(console.error);
        }
      }),
    ]).then((fns) => {
      if (cancelled) {
        for (const fn of fns) {
          fn();
        }
      } else {
        unsubs.push(...fns);
      }
    });

    return () => {
      cancelled = true;
      for (const fn of unsubs) {
        fn();
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;

    getCurrentWebview()
      .onDragDropEvent((event) => {
        if (event.payload.type === "drop") {
          const firstPdf = event.payload.paths.find((p) =>
            p.toLowerCase().endsWith(".pdf")
          );
          if (firstPdf) {
            handleDroppedFileRef.current(firstPdf).catch(console.error);
          } else if (event.payload.paths.length > 0) {
            toast.error("Please drop a PDF file");
          }
        }
      })
      .then((fn) => {
        if (cancelled) {
          fn();
        } else {
          unlisten = fn;
        }
      })
      .catch(console.error);

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  return (
    <SheetsSidebar
      currentSheetId={currentId}
      onGoHome={() => navigate("/")}
      onOpenFolder={handleOpenFolder}
      onOpenInFolder={handleOpenInFolder}
      onOpenPdf={handleOpenPdf}
      onOpenSettings={() => navigate("/settings")}
      onSelectSheet={(id) => {
        const sheet = sheets.find((s) => s.id === id);
        if (sheet) {
          setSheetPath(sheet.storedPath);
          setSheetId(id);
        }
        navigate(`/sheets/${id}`);
      }}
      sheets={sheets}
    />
  );
}
