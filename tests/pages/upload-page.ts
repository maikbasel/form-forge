import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

const BROWSE_SHEETS_PATTERN = /browse sheets/i;
const SHEET_URL_PATTERN = /\/sheets\/[a-f0-9-]+/;
const UPLOAD_HEADING_PATTERN = /upload pdf character sheet/i;

export class UploadPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto("/");
  }

  async uploadPDF(filePath: string) {
    const fileChooserPromise = this.page.waitForEvent("filechooser");

    // Click the browse button to trigger file chooser
    await this.page
      .getByRole("button", { name: BROWSE_SHEETS_PATTERN })
      .click();

    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);

    // Wait for navigation to sheet viewer page
    await this.page.waitForURL(SHEET_URL_PATTERN);
  }

  async verifyPageLoaded() {
    await expect(
      this.page.getByRole("heading", { name: UPLOAD_HEADING_PATTERN })
    ).toBeVisible();
  }
}
