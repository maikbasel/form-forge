/** biome-ignore-all lint/performance/noBarrelFile: This is actually not a barrel file. */
import { test as base } from "@playwright/test";
import { SheetViewerPage } from "./pages/sheet-viewer-page";
import { UploadPage } from "./pages/upload-page";

type PageFixtures = {
  uploadPage: UploadPage;
  sheetViewerPage: SheetViewerPage;
};

export const test = base.extend<PageFixtures>({
  uploadPage: async ({ page }, use) => {
    await use(new UploadPage(page));
  },
  sheetViewerPage: async ({ page }, use) => {
    await use(new SheetViewerPage(page));
  },
});

export { expect } from "@playwright/test";
