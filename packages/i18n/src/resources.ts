import actionsDe from "../locales/de/actions.json";
import commonDe from "../locales/de/common.json";
import sheetsDe from "../locales/de/sheets.json";
import actionsEn from "../locales/en/actions.json";
import commonEn from "../locales/en/common.json";
import sheetsEn from "../locales/en/sheets.json";

export const resources = {
  en: {
    common: commonEn,
    sheets: sheetsEn,
    actions: actionsEn,
  },
  de: {
    common: commonDe,
    sheets: sheetsDe,
    actions: actionsDe,
  },
} as const;
