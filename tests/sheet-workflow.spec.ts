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

    await test.step("Attach an ability modifier", async () => {
      await sheetViewerPage.startCalculation("Ability Modifier");
      await sheetViewerPage.pickFields(["STRmod", "STR"]);
      await sheetViewerPage.attachCalculation();
      await sheetViewerPage.verifySuccessToast("Ability Modifier attached to STRmod");
      await sheetViewerPage.finishBuilding();
      await sheetViewerPage.verifyCalculationListed("Ability Modifier");
    });

    await test.step("Attach a saving throw modifier", async () => {
      await sheetViewerPage.startCalculation("Saving Throw Modifier");
      await sheetViewerPage.pickFields([
        "ST Strength",
        "STRmod",
        "ProfBonus",
        "Check Box 11",
      ]);
      await sheetViewerPage.attachCalculation();
      await sheetViewerPage.verifySuccessToast(
        "Saving Throw Modifier attached to ST Strength"
      );
      await sheetViewerPage.finishBuilding();
      await sheetViewerPage.verifyCalculationListed("Saving Throw Modifier");
    });

    await test.step("Attach a skill modifier", async () => {
      await sheetViewerPage.startCalculation("Skill Modifier");
      await sheetViewerPage.pickFields([
        "Athletics",
        "STRmod",
        "ProfBonus",
        "Check Box 26",
      ]);
      await sheetViewerPage.attachCalculation();
      await sheetViewerPage.verifySuccessToast(
        "Skill Modifier attached to Athletics"
      );
      await sheetViewerPage.finishBuilding();
      await sheetViewerPage.verifyCalculationListed("Skill Modifier");
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
