import "@testing-library/jest-dom/vitest";
import { initI18n } from "@repo/i18n";
import { vi } from "vitest";

// Initialize i18n with English for tests
initI18n("en");

// Mock react-pdf: simulates onLoadSuccess with numPages: 3, renders placeholder divs
vi.mock("react-pdf", () => {
  const { createElement } = require("react");
  return {
    pdfjs: {
      GlobalWorkerOptions: { workerSrc: "" },
    },
    Document: (props: {
      onLoadSuccess?: (doc: { numPages: number }) => void;
      children?: unknown;
    }) => {
      if (props.onLoadSuccess) {
        setTimeout(() => props.onLoadSuccess?.({ numPages: 3 }), 0);
      }
      return createElement(
        "div",
        { "data-testid": "pdf-document" },
        props.children
      );
    },
    Page: (props: { pageNumber: number }) => {
      return createElement("div", {
        "data-testid": `pdf-page-${props.pageNumber}`,
      });
    },
  };
});

// Mock sonner: captures toast calls for assertion
const toastFn = Object.assign(vi.fn(), {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
});

vi.mock("sonner", () => ({
  toast: toastFn,
  Toaster: () => null,
}));
