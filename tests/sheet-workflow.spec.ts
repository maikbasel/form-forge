import { join } from "node:path";
import { test } from "./fixtures";

test.describe("Sheet Workflow - Happy Path", () => {
  test("should upload PDF, add action, and download sheet", async ({
    uploadPage,
    sheetViewerPage,
  }) => {
    await test.step("Upload PDF", async () => {
      await uploadPage.goto();
      await uploadPage.verifyPageLoaded();

      const pdfPath = join(
        __dirname,
        "../apps/api/crates/sheets/adapters/pdf/tests/fixtures/DnD_5E_CharacterSheet_FormFillable.pdf"
      );
      await uploadPage.uploadPDF(pdfPath);
    });

    await test.step("Navigate to sheet viewer", async () => {
      await sheetViewerPage.verifyPageLoaded();
    });

    await test.step("Select fields for action", async () => {
      // For the D&D character sheet, we'll use STR (Strength) as an example
      await sheetViewerPage.selectField("STRmod");
      await sheetViewerPage.selectField("STR");
    });

    await test.step("Configure ability modifier action", async () => {
      await sheetViewerPage.openActionModal();
      await sheetViewerPage.selectActionType("Ability Modifier");
      await sheetViewerPage.assignFieldToRole("STR", "Ability Score");
      await sheetViewerPage.assignFieldToRole("STRmod", "Target Modifier");
      await sheetViewerPage.attachAction();
    });

    await test.step("Verify action attached successfully", async () => {
      await sheetViewerPage.verifySuccessToast("attached successfully");
      await sheetViewerPage.verifyActionAttached("Ability Modifier");
    });

    await test.step("Download and verify sheet", async () => {
      const download = await sheetViewerPage.downloadSheet();
      await sheetViewerPage.verifySuccessToast("downloaded successfully");

      const downloadPath = join(
        __dirname,
        "downloads",
        download.suggestedFilename()
      );
      await download.saveAs(downloadPath);
    });
  });
});
