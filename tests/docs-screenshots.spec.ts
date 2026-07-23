import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { test } from "./fixtures";

const ASSET_DIR = join(__dirname, "../docs/assets/usage");

// Hide the Next.js dev-mode indicator (the "N | 1 Issue" badge) so it stays
// out of the docs screenshots and video. The dev tools render inside a
// top-level <nextjs-portal> host; display:none on the host hides its shadow
// content too. Injected as a plain <style> on the live page (NOT addInitScript,
// which runs on every document creation and interferes with the export
// download). The app navigates client-side, so one injection covers the flow.
const HIDE_DEV_BADGE = "nextjs-portal{display:none !important}";
const hideDevBadge = (page) =>
  page.addStyleTag({ content: HIDE_DEV_BADGE }).catch(() => {
    // ignore if the page is mid-navigation; re-applied at the next step
  });

const shot = (page, name: string) =>
  page.screenshot({ path: join(ASSET_DIR, name), animations: "disabled" });

// Rest the video on a readable frame after a visible state change. Applied at
// key moments only (not via slowMo, which drags every micro-action and blows
// up both the timeout and the webm size). Low-motion pauses compress well.
const rest = (page) => page.waitForTimeout(1200);

// Record a webm of the whole flow; fixed viewport for a clean frame.
test.use({
  video: { mode: "on", size: { width: 1280, height: 800 } },
  viewport: { width: 1280, height: 800 },
});

test("capture usage flow visuals", async ({
  page,
  uploadPage,
  sheetViewerPage,
}) => {
  // ponytail: first-hit Next.js dev compiles + video recording + rest frames
  // exceed the default 30s test timeout; this flow is a real, longer walk.
  test.setTimeout(180_000);

  await mkdir(ASSET_DIR, { recursive: true });

  await test.step("Upload PDF", async () => {
    await uploadPage.goto();
    await uploadPage.verifyPageLoaded();
    await hideDevBadge(page);
    await shot(page, "01-upload.png");
    const pdfPath = join(
      __dirname,
      "../crates/sheets_pdf/tests/fixtures/DnD_5E_CharacterSheet_FormFillable.pdf"
    );
    await uploadPage.uploadPDF(pdfPath);
  });

  await test.step("Sheet viewer loaded", async () => {
    await sheetViewerPage.verifyPageLoaded();
    await hideDevBadge(page);
    await rest(page);
    await shot(page, "02-viewer.png");
  });

  await test.step("Select fields", async () => {
    await sheetViewerPage.selectField("STRmod");
    await sheetViewerPage.selectField("STR");
    await rest(page);
    await shot(page, "03-select-fields.png");
  });

  await test.step("Configure Ability Modifier action", async () => {
    await sheetViewerPage.openActionModal();
    await sheetViewerPage.selectActionType("Ability Modifier");
    await sheetViewerPage.assignFieldToRole("STR", "Ability Score");
    await sheetViewerPage.assignFieldToRole("STRmod", "Target Modifier");
    await rest(page);
    await shot(page, "04-configure-action.png");
    await sheetViewerPage.attachAction();
    await sheetViewerPage.verifySuccessToast("attached successfully");
    await sheetViewerPage.verifyActionAttached("Ability Modifier");
    // Let the video rest on the attached-action result before downloading.
    await rest(page);
  });

  await test.step("Download sheet", async () => {
    await shot(page, "05-download.png");
    // Trigger the export. The app downloads via a blob-URL anchor and revokes
    // the URL immediately, so the browser download event is racy. Consume it
    // with a short timeout (don't fail the docs run on it) and don't let the
    // click wait on it. Then confirm the success toast.
    const download = page
      .waitForEvent("download", { timeout: 6000 })
      .catch(() => null);
    await page
      .getByRole("button", { name: /export/i })
      .click({ noWaitAfter: true });
    await download;
    await sheetViewerPage.verifySuccessToast("exported successfully");
    await rest(page);
  });

  // No page.video().saveAs() here: it waits for the page to close, which only
  // happens in fixture teardown AFTER this body returns, so awaiting it
  // deadlocks. With video mode "on", Playwright writes the recording to the
  // test's output dir on completion; the runner copies it to docs/assets.
});
