import { Progress } from "@repo/ui/components/progress.tsx";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import type { TFunction } from "i18next";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const UPDATE_TOAST_ID = "app-update";
const PERCENT = 100;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function showFailure(t: TFunction<"common">, error: unknown) {
  toast.error(t("updater.failed", { message: errorMessage(error) }), {
    id: UPDATE_TOAST_ID,
    duration: Number.POSITIVE_INFINITY,
    description: undefined,
    action: undefined,
    cancel: undefined,
  });
}

function showProgress(t: TFunction<"common">, progress: number | null) {
  toast.loading(
    progress === null
      ? t("updater.downloading")
      : t("updater.downloadingProgress", { progress }),
    {
      id: UPDATE_TOAST_ID,
      duration: Number.POSITIVE_INFINITY,
      description: (
        <Progress
          aria-label={t("updater.downloading")}
          className="mt-2"
          value={progress}
        />
      ),
      action: undefined,
      cancel: undefined,
    }
  );
}

async function installUpdate(update: Update, t: TFunction<"common">) {
  let total = 0;
  let downloaded = 0;
  let shownProgress: number | null = null;
  showProgress(t, null);

  try {
    await update.downloadAndInstall((event) => {
      if (event.event === "Started") {
        total = event.data.contentLength ?? 0;
        return;
      }
      if (event.event !== "Progress" || total === 0) {
        return;
      }
      downloaded += event.data.chunkLength;
      const progress = Math.min(
        PERCENT,
        Math.round((downloaded / total) * PERCENT)
      );
      // Chunks arrive far more often than the percentage changes.
      if (progress !== shownProgress) {
        shownProgress = progress;
        showProgress(t, progress);
      }
    });
  } catch (error) {
    showFailure(t, error);
    return;
  }

  // Windows quits the app to run the installer, so only macOS/Linux get here.
  toast.success(t("updater.ready", { version: update.version }), {
    id: UPDATE_TOAST_ID,
    duration: Number.POSITIVE_INFINITY,
    description: t("updater.readyDescription"),
    action: {
      label: t("updater.restart"),
      onClick: () => {
        relaunch().catch((error: unknown) => showFailure(t, error));
      },
    },
    cancel: undefined,
  });
}

function offerUpdate(update: Update, t: TFunction<"common">) {
  // Ask first so an update never restarts the app mid-edit.
  toast(t("updater.available", { version: update.version }), {
    id: UPDATE_TOAST_ID,
    duration: Number.POSITIVE_INFINITY,
    description: undefined,
    action: {
      label: t("updater.install"),
      onClick: (event) => {
        // Keep the toast open; it turns into the progress display.
        event.preventDefault();
        installUpdate(update, t).catch(console.error);
      },
    },
    cancel: {
      label: t("updater.later"),
      onClick: () => toast.dismiss(UPDATE_TOAST_ID),
    },
  });
}

/** User-triggered check: unlike the startup check, it reports every outcome. */
export async function checkForUpdateManually(t: TFunction<"common">) {
  let update: Update | null;
  try {
    update = await check();
  } catch (error) {
    showFailure(t, error);
    return;
  }
  if (update) {
    offerUpdate(update, t);
  } else {
    toast.success(t("updater.upToDate"), { id: UPDATE_TOAST_ID });
  }
}

/** Checks GitHub releases for a newer signed build and offers to install it. */
export function UpdateChecker() {
  const { t } = useTranslation("common");

  useEffect(() => {
    if (import.meta.env.DEV) {
      return;
    }
    let cancelled = false;

    check()
      .then((update) => {
        if (!(cancelled || update === null)) {
          offerUpdate(update, t);
        }
      })
      // Offline or GitHub unreachable: retry silently on next launch.
      .catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [t]);

  return null;
}
