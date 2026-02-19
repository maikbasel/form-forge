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
import { useNavigate } from "react-router-dom";
import { useTheme } from "../components/theme-provider";
import { getExportDir, setExportDir, type Theme } from "../lib/settings";

const GITHUB_URL = "https://github.com/maikbasel/form-forge";

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [exportDir, setExportDirState] = useState<string | null>(getExportDir);
  const [dataDir, setDataDir] = useState<string>("");

  useEffect(() => {
    getCurrentWindow().setTitle("Settings – Form Forge").catch(console.error);
    appDataDir().then(setDataDir).catch(console.error);
  }, []);

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
        Back
      </Button>

      <div>
        <h1 className="font-bold text-2xl">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage your Form Forge preferences.
        </p>
      </div>

      <Separator />

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose your preferred color theme.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {THEME_OPTIONS.map((opt) => (
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

      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle>Export</CardTitle>
          <CardDescription>
            Where exported PDFs are saved after processing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Current directory:{" "}
            <span className="font-mono text-foreground">
              {exportDir ?? "Default (app data folder)"}
            </span>
          </p>
          <div className="flex gap-2">
            <Button onClick={handleChangeExportDir} size="sm" variant="outline">
              Change…
            </Button>
            {exportDir && (
              <Button onClick={handleResetExportDir} size="sm" variant="ghost">
                Reset to default
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data */}
      <Card>
        <CardHeader>
          <CardTitle>Data</CardTitle>
          <CardDescription>
            Location of the app database and stored sheets.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="font-mono text-muted-foreground text-sm">
            {dataDir || "Loading…"}
          </p>
          <Button onClick={handleOpenDataDir} size="sm" variant="outline">
            Open in Files
          </Button>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
          <CardDescription>Form Forge application information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Version:{" "}
            <span className="font-mono text-foreground">
              {import.meta.env.VITE_APP_VERSION ?? "development"}
            </span>
          </p>
          <Button onClick={handleViewOnGitHub} size="sm" variant="outline">
            View on GitHub
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
