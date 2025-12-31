import type { Download, Page } from "@playwright/test";
import { expect } from "@playwright/test";

const CONFIGURE_ACTION_REGEX = /configure action/i;
const ATTACH_CALCULATION_REGEX = /attach calculation/i;
const DOWNLOAD_REGEX = /download/i;
const PDF_FILENAME_REGEX = /\.pdf$/;

export class SheetViewerPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async selectField(fieldName: string) {
    // Fields are rendered as Toggle elements with aria-label
    const fieldToggle = this.page.locator(
      `button[aria-label="Select field ${fieldName}"]`
    );
    await fieldToggle.click();
  }

  async openActionModal() {
    await this.page
      .getByRole("button", { name: CONFIGURE_ACTION_REGEX })
      .click();
  }

  async selectActionType(actionName: string) {
    await this.page
      .getByRole("button", { name: new RegExp(actionName, "i") })
      .click();
  }

  async assignFieldToRole(fieldName: string, roleLabel: string) {
    // Find the select trigger by test ID (unique per role)
    const selectTrigger = this.page.getByTestId(
      `role-select-trigger-${roleLabel.toLowerCase().replace(/\s+/g, "-")}`
    );
    await selectTrigger.click();

    // Select the field from dropdown
    await this.page
      .getByRole("option", { name: fieldName, exact: true })
      .click();
  }

  async attachAction() {
    await this.page
      .getByRole("button", { name: ATTACH_CALCULATION_REGEX })
      .click();
  }

  async verifyActionAttached(actionName: string) {
    // The attached action should appear in the sidebar
    await expect(
      this.page.locator(".space-y-3").getByText(actionName, { exact: true })
    ).toBeVisible();
  }

  async downloadSheet(): Promise<Download> {
    const downloadPromise = this.page.waitForEvent("download");

    await this.page.getByRole("button", { name: DOWNLOAD_REGEX }).click();

    const download = await downloadPromise;

    // Verify the download has a filename
    expect(download.suggestedFilename()).toMatch(PDF_FILENAME_REGEX);

    return download;
  }

  async verifyPageLoaded() {
    // Wait for PDF to render - check for canvas element or field toggles
    await expect(
      this.page.locator('canvas, button[aria-label^="Select field"]').first()
    ).toBeVisible({ timeout: 15_000 });
  }

  async verifySuccessToast(message: string) {
    await expect(this.page.getByText(message, { exact: false })).toBeVisible({
      timeout: 10_000,
    });
  }
}
