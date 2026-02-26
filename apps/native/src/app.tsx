import { Toaster } from "@repo/ui/components/sonner.tsx";
import { ApiClientProvider } from "@repo/ui/context/api-client-context.tsx";
import { FieldSnippetProvider } from "@repo/ui/context/field-snippet-context.tsx";
import { SheetProvider } from "@repo/ui/context/sheet-context.tsx";
import { I18nextProvider } from "react-i18next";
import { RouterProvider } from "react-router-dom";
import { ThemeProvider } from "./components/theme-provider";
import { i18n } from "./lib/i18n";
import { tauriApiClient } from "./lib/tauri-api-client";
import { router } from "./router";

function App() {
  return (
    <ThemeProvider>
      <I18nextProvider i18n={i18n}>
        <ApiClientProvider client={tauriApiClient}>
          <SheetProvider>
            <FieldSnippetProvider>
              <RouterProvider router={router} />
              <Toaster />
            </FieldSnippetProvider>
          </SheetProvider>
        </ApiClientProvider>
      </I18nextProvider>
    </ThemeProvider>
  );
}

export default App;
