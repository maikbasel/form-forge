import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "./fixtures";
import {
  readDocumentJavaScript,
  readFieldCalculationJS,
} from "./utils/pdf-utils";

test.describe("Sheet Workflow - Happy Path", () => {
  test("should upload PDF, add multiple actions, and download sheet", async ({
    uploadPage,
    sheetViewerPage,
  }) => {
    await test.step("Upload PDF", async () => {
      await uploadPage.goto();
      await uploadPage.verifyPageLoaded();

      const pdfPath = join(
        __dirname,
        "../crates/sheets_pdf/tests/fixtures/DnD_5E_CharacterSheet_FormFillable.pdf"
      );
      await uploadPage.uploadPDF(pdfPath);
    });

    await test.step("Navigate to sheet viewer", async () => {
      await sheetViewerPage.verifyPageLoaded();
    });

    await test.step("Select fields for ability modifier action", async () => {
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

    await test.step("Verify ability modifier action attached", async () => {
      await sheetViewerPage.verifySuccessToast("attached successfully");
      await sheetViewerPage.verifyActionAttached("Ability Modifier");
    });

    await test.step("Select fields for saving throw modifier action", async () => {
      await sheetViewerPage.selectField("ST Strength");
      await sheetViewerPage.selectField("STRmod");
      await sheetViewerPage.selectField("Check Box 11");
      await sheetViewerPage.selectField("ProfBonus");
    });

    await test.step("Configure saving throw modifier action", async () => {
      await sheetViewerPage.openActionModal();
      await sheetViewerPage.selectActionType("Saving Throw Modifier");
      await sheetViewerPage.assignFieldToRole("STRmod", "Ability Modifier");
      await sheetViewerPage.assignFieldToRole("Check Box 11", "Proficiency");
      await sheetViewerPage.assignFieldToRole("ProfBonus", "Proficiency Bonus");
      await sheetViewerPage.assignFieldToRole(
        "ST Strength",
        "Target Saving Throw"
      );
      await sheetViewerPage.attachAction();
    });

    await test.step("Verify saving throw modifier action attached", async () => {
      await sheetViewerPage.verifySuccessToast("attached successfully");
      await sheetViewerPage.verifyActionAttached("Saving Throw Modifier");
    });

    await test.step("Select fields for skill modifier action", async () => {
      await sheetViewerPage.selectField("Athletics");
      await sheetViewerPage.selectField("STRmod");
      await sheetViewerPage.selectField("Check Box 26");
      await sheetViewerPage.selectField("ProfBonus");
    });

    await test.step("Configure skill modifier action", async () => {
      await sheetViewerPage.openActionModal();
      await sheetViewerPage.selectActionType("Skill Modifier");
      await sheetViewerPage.assignFieldToRole("STRmod", "Ability Modifier");
      await sheetViewerPage.assignFieldToRole("Check Box 26", "Proficiency");
      await sheetViewerPage.assignFieldToRole("ProfBonus", "Proficiency Bonus");
      await sheetViewerPage.assignFieldToRole("Athletics", "Target Skill");
      await sheetViewerPage.attachAction();
    });

    await test.step("Verify skill modifier action attached", async () => {
      await sheetViewerPage.verifySuccessToast("attached successfully");
      await sheetViewerPage.verifyActionAttached("Skill Modifier");
    });

    await test.step("Download and verify sheet", async () => {
      const download = await sheetViewerPage.downloadSheet();
      await sheetViewerPage.verifySuccessToast("exported successfully");

      const downloadPath = join(
        __dirname,
        "downloads",
        download.suggestedFilename()
      );
      await download.saveAs(downloadPath);

      // Read the PDF and verify JavaScript
      const pdfBytes = await readFile(downloadPath);

      // Verify document-level JavaScript
      const docJS = await readDocumentJavaScript(pdfBytes);
      expect(docJS).toHaveLength(1);
      expect(docJS[0][0]).toBe("HelpersJS");
      expect(docJS[0][1]).toContain("calculateModifierFromScore");
      expect(docJS[0][1]).toContain("calculateSaveFromFields");
      expect(docJS[0][1]).toContain("calculateSkillFromFields");

      // Verify ability modifier field calculation
      const abilityModJS = await readFieldCalculationJS(pdfBytes, "STRmod");
      expect(abilityModJS).toBe('calculateModifierFromScore("STR");');

      // Verify saving throw modifier field calculation
      const savingThrowJS = await readFieldCalculationJS(
        pdfBytes,
        "ST Strength"
      );
      expect(savingThrowJS).toBe(
        'calculateSaveFromFields("STRmod", "Check Box 11", "ProfBonus");'
      );

      // Verify skill modifier field calculation
      const skillModJS = await readFieldCalculationJS(pdfBytes, "Athletics");
      expect(skillModJS).toBe(
        'calculateSkillFromFields("STRmod", "Check Box 26", undefined, undefined, "ProfBonus");'
      );
    });
  });
});
