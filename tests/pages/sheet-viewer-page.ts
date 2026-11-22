import type { Download, Page } from "@playwright/test";
import { expect } from "@playwright/test";

const NEW_CALCULATION_REGEX = /new calculation/i;
const ATTACH_CALCULATION_REGEX = /attach calculation/i;
const DONE_REGEX = /^done$/i;
const EXPORT_REGEX = /export/i;
const PDF_FILENAME_REGEX = /\.pdf$/;

export class SheetViewerPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /** Opens the builder and chooses a calculation type. */
  async startCalculation(typeName: string) {
    await this.page
      .getByRole("button", { name: NEW_CALCULATION_REGEX })
      .click();
    await this.page
      .getByRole("button", { name: new RegExp(`^${typeName}`, "i") })
      .click();
  }

  /** Clicks a field on the sheet while a step waits for one. */
  async pickField(fieldName: string) {
    await this.page
      .locator(`button[aria-label="Pick field ${fieldName}"]`)
      .click();
  }

  /** Picks fields in step order: result field first, then the inputs. */
  async pickFields(fieldNames: string[]) {
    for (const name of fieldNames) {
      await this.pickField(name);
    }
  }

  async attachCalculation() {
    await this.page
      .getByRole("button", { name: ATTACH_CALCULATION_REGEX })
      .click();
  }

  async finishBuilding() {
    await this.page.getByRole("button", { name: DONE_REGEX }).click();
  }

  async verifyCalculationListed(name: string) {
    await expect(
      this.page.getByRole("heading", { level: 3, name, exact: true })
    ).toBeVisible();
  }

  async downloadSheet(): Promise<Download> {
    const downloadPromise = this.page.waitForEvent("download");

    await this.page.getByRole("button", { name: EXPORT_REGEX }).click();

    const download = await downloadPromise;

    // Verify the download has a filename
    expect(download.suggestedFilename()).toMatch(PDF_FILENAME_REGEX);

    return download;
  }

  async verifyPageLoaded() {
    // Field overlays appear once the PDF has rendered and fields are mapped
    await expect(this.page.locator("[data-field-name]").first()).toBeVisible({
      timeout: 15_000,
    });
  }

  async verifySuccessToast(message: string) {
    await expect(
      this.page.getByText(message, { exact: false }).first()
    ).toBeVisible({
      timeout: 10_000,
    });
  }
}
