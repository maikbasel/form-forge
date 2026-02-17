import { Toaster } from "@repo/ui/components/sonner.tsx";
import { ApiClientProvider } from "@repo/ui/context/api-client-context.tsx";
import { FieldSnippetProvider } from "@repo/ui/context/field-snippet-context.tsx";
import { SheetProvider } from "@repo/ui/context/sheet-context.tsx";
import { RouterProvider } from "react-router-dom";
import { tauriApiClient } from "./lib/tauri-api-client";
import { router } from "./router";

function App() {
  return (
    <ApiClientProvider client={tauriApiClient}>
      <SheetProvider>
        <FieldSnippetProvider>
          <RouterProvider router={router} />
          <Toaster />
        </FieldSnippetProvider>
      </SheetProvider>
    </ApiClientProvider>
  );
}

export default App;
