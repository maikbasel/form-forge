import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Separator } from "@repo/ui/components/separator";
import { appDataDir } from "@tauri-apps/api/path";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { openPath, openUrl } from "@tauri-apps/plugin-opener";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../components/theme-provider";
import { getExportDir, setExportDir, type Theme } from "../lib/settings";

const GITHUB_URL = "https://github.com/maikbasel/form-forge";

export default function SettingsPage() {
  const { t } = useTranslation("actions");
  const { t: tCommon, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [exportDir, setExportDirState] = useState<string | null>(null);
  const [dataDir, setDataDir] = useState<string>("");

  const themeOptions: { value: Theme; label: string }[] = [
    { value: "light", label: tCommon("theme.light") },
    { value: "dark", label: tCommon("theme.dark") },
    { value: "system", label: tCommon("theme.system") },
  ];

  useEffect(() => {
    getCurrentWindow()
      .setTitle(t("settingsNative.windowTitle"))
      .catch(console.error);
    appDataDir().then(setDataDir).catch(console.error);
    getExportDir().then(setExportDirState).catch(console.error);
  }, [t]);

  const handleChangeExportDir = async () => {
    const selected = await open({ directory: true, multiple: false });
    if (!selected) {
      return;
    }
    setExportDir(selected);
    setExportDirState(selected);
  };

  const handleResetExportDir = () => {
    setExportDir(null);
    setExportDirState(null);
  };

  const handleOpenDataDir = async () => {
    if (dataDir) {
      await openPath(dataDir).catch(console.error);
    }
  };

  const handleViewOnGitHub = async () => {
    await openUrl(GITHUB_URL).catch(console.error);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <Button onClick={() => navigate(-1)} size="sm" variant="ghost">
        <ArrowLeft className="mr-1 size-4" />
        {tCommon("back")}
      </Button>

      <div>
        <h1 className="font-bold text-2xl">{t("settingsNative.heading")}</h1>
        <p className="text-muted-foreground text-sm">
          {t("settingsNative.description")}
        </p>
      </div>

      <Separator />

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settingsNative.appearance")}</CardTitle>
          <CardDescription>
            {t("settingsNative.appearanceDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {themeOptions.map((opt) => (
              <Button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                size="sm"
                variant={theme === opt.value ? "default" : "outline"}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle>{tCommon("language.toggle")}</CardTitle>
          <CardDescription>
            {t("settingsNative.appearanceDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {(["en", "de"] as const).map((code) => (
              <Button
                key={code}
                onClick={() => i18n.changeLanguage(code)}
                size="sm"
                variant={i18n.language.startsWith(code) ? "default" : "outline"}
              >
                {tCommon(`language.${code}`)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settingsNative.exportSection")}</CardTitle>
          <CardDescription>
            {t("settingsNative.exportDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            {t("settingsNative.currentDirectory")}{" "}
            <span className="font-mono text-foreground">
              {exportDir ?? t("settingsNative.defaultAppDataFolder")}
            </span>
          </p>
          <div className="flex gap-2">
            <Button onClick={handleChangeExportDir} size="sm" variant="outline">
              {t("settingsNative.change")}
            </Button>
            {exportDir && (
              <Button onClick={handleResetExportDir} size="sm" variant="ghost">
                {t("settingsNative.resetToDefault")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settingsNative.data")}</CardTitle>
          <CardDescription>
            {t("settingsNative.dataDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="font-mono text-muted-foreground text-sm">
            {dataDir || tCommon("loading")}
          </p>
          <Button onClick={handleOpenDataDir} size="sm" variant="outline">
            {t("settingsNative.openInFiles")}
          </Button>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settingsNative.about")}</CardTitle>
          <CardDescription>
            {t("settingsNative.aboutDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            {t("settingsNative.version")}{" "}
            <span className="font-mono text-foreground">
              {import.meta.env.VITE_APP_VERSION ??
                t("settingsNative.development")}
            </span>
          </p>
          <Button onClick={handleViewOnGitHub} size="sm" variant="outline">
            {t("settingsNative.viewOnGithub")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
