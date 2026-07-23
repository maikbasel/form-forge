# Desktop App

Form Forge also ships as a desktop app (built with Tauri) that bundles the
backend on your machine. There's no Docker and no server to run. It works
offline, and your PDFs stay local.

## Install

Download the build for your operating system from the
[Releases](https://github.com/maikbasel/form-forge/releases) page.

=== "Windows"

    Run the `.msi` or `.exe` installer.

    Microsoft SmartScreen may show a "Windows protected your PC" warning
    because the app isn't code-signed. Click **More info**, then **Run anyway**.

=== "macOS"

    Open the `.dmg` and drag Form Forge to your Applications folder.

    Gatekeeper says the app "can't be opened because it is from an unidentified
    developer," because the app isn't code-signed. Open **System Settings >
    Privacy & Security**, find the blocked app, and click **Open Anyway** (or
    right-click the app and choose **Open**).

=== "Linux"

    Use the `.AppImage` (portable: `chmod +x` it, then run it), or the `.deb`
    / `.rpm` for your package manager. No signing step is needed.

    If the app opens to a blank window, see
    [Linux + NVIDIA](#linux-nvidia-blank-window) below.

!!! note "Why the binaries are unsigned"
    Code signing certificates are costly for an open-source project, so the
    binaries ship unsigned. The app is safe to use, and you can verify it
    yourself by [building from source](#building-from-source).

### Linux + NVIDIA: blank window

On Linux with an NVIDIA GPU, the app may open to a blank or white window. This
is a known WebKitGTK issue with NVIDIA's driver, not a Form Forge bug. Launch
it with the DMABUF renderer disabled:

```bash
WEBKIT_DISABLE_DMABUF_RENDERER=1 ./Form\ Forge_*.AppImage
```

If you installed the `.deb` / `.rpm`, set the same variable before launching,
or add it to the app's `.desktop` launcher `Exec=` line so it sticks:

```bash
WEBKIT_DISABLE_DMABUF_RENDERER=1 form-forge
```

If a blank window persists, try `WEBKIT_DISABLE_COMPOSITING_MODE=1` instead.

## Using the app

The desktop app works the same as the web version. Follow
[Using Form Forge](players/index.md) to upload a character sheet, attach
calculations, and export. The one difference: when you export, the desktop app
saves the finished PDF straight to a folder you pick, instead of downloading it
through a browser.

## Building from Source

Building from source produces the Tauri desktop binary. Ensure you have the
prerequisites installed, including the
[Tauri v2 system dependencies](https://v2.tauri.app/start/prerequisites/) for your platform.

```bash
git clone https://github.com/maikbasel/form-forge.git
cd form-forge
pnpm install
cd apps/native
pnpm tauri build
```

The compiled binaries will be in `apps/native/src-tauri/target/release/bundle/`.
