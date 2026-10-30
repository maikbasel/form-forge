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

    Requires a Mac with Apple Silicon (M1 or newer). Intel Macs aren't
    supported.

    Open the `.dmg` and drag Form Forge to your Applications folder.

    Gatekeeper blocks the first launch because the app isn't code-signed.
    Open **System Settings > Privacy & Security**, scroll to the message about
    Form Forge, and click **Open Anyway**. On macOS 14 and earlier you can also
    right-click the app and choose **Open**. macOS 15 removed that shortcut.

    If macOS says the app "is damaged and can't be opened", it's the download
    quarantine flag, not a broken file. Clear it in Terminal:

    ```bash
    xattr -cr "/Applications/Form Forge.app"
    ```

=== "Linux"

    Requires x86_64 and glibc 2.39 or newer: Ubuntu 24.04, Debian 13,
    Fedora 40, or later. Older distros fail to start the app with a
    `GLIBC_2.xx not found` error.

    Use the `.AppImage` (portable: `chmod +x` it, then run it), or the `.deb`
    / `.rpm` for your package manager. No signing step is needed.

    The `.deb` / `.rpm` add Form Forge to your app menu. The AppImage does
    not; see [Linux: add the AppImage to your app menu](#linux-add-the-appimage-to-your-app-menu).

    If the app opens to a blank window, see
    [Linux + NVIDIA](#linux-nvidia-blank-window) below.

!!! note "Why the binaries are unsigned"
    Code signing certificates are costly for an open-source project, so the
    binaries ship unsigned. The app is safe to use, and you can verify it
    yourself by [building from source](#building-from-source).

### Linux: add the AppImage to your app menu

An AppImage is a single portable file, so it doesn't register itself with your
launcher or app menu. The easiest fix is an AppImage manager such as
[Gear Lever](https://flathub.org/apps/it.mijorus.gearlever) or
[AppImageLauncher](https://github.com/TheAssassin/AppImageLauncher). Open the
AppImage with one of them and it creates the menu entry for you.

To set it up by hand, move the AppImage to a permanent location under a fixed
name, extract its icon, and write a `.desktop` entry:

```bash
mkdir -p ~/Applications ~/.local/share/icons ~/.local/share/applications
mv ~/Downloads/Form.Forge_*_amd64.AppImage ~/Applications/form-forge.AppImage
chmod +x ~/Applications/form-forge.AppImage

# Extract the bundled icon
cd /tmp && ~/Applications/form-forge.AppImage --appimage-extract 'Form Forge.png'
cp '/tmp/squashfs-root/Form Forge.png' ~/.local/share/icons/form-forge.png
rm -rf /tmp/squashfs-root

cat > ~/.local/share/applications/form-forge.desktop <<EOF
[Desktop Entry]
Type=Application
Name=Form Forge
Exec=$HOME/Applications/form-forge.AppImage
Icon=$HOME/.local/share/icons/form-forge.png
Categories=Office;
Terminal=false
EOF
```

Form Forge appears in your launcher after a few seconds. If it doesn't, log out
and back in. Keep the fixed file name: the in-app updater replaces the
AppImage in place, so the menu entry keeps working after updates. On NVIDIA,
add `env WEBKIT_DISABLE_DMABUF_RENDERER=1 ` to the start of the `Exec=` value
(see below).

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
WEBKIT_DISABLE_DMABUF_RENDERER=1 native
```

The installed binary is named `native`. The menu entry is
`/usr/share/applications/Form Forge.desktop`.

If a blank window persists, try `WEBKIT_DISABLE_COMPOSITING_MODE=1` instead.

## Uninstall

=== "Windows"

    Open **Settings > Apps > Installed apps**, find Form Forge, and choose
    **Uninstall**.

=== "macOS"

    Drag Form Forge from your Applications folder to the Trash.

=== "Linux"

    Remove the package with `sudo apt remove form-forge` (`.deb`) or
    `sudo dnf remove form-forge` (`.rpm`).

    For the AppImage, delete the file. If you added a menu entry by hand, also
    delete `~/.local/share/applications/form-forge.desktop` and
    `~/.local/share/icons/form-forge.png`.

Uninstalling leaves your local data in place. Delete the
`com.form-forge.app` folder to remove it too: `%APPDATA%` on Windows,
`~/Library/Application Support` on macOS, `~/.local/share` on Linux.

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
