import type actions from "../locales/en/actions.json";
import type common from "../locales/en/common.json";
import type sheets from "../locales/en/sheets.json";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: {
      common: typeof common;
      sheets: typeof sheets;
      actions: typeof actions;
    };
  }
}
