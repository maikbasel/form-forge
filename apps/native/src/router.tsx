import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "./components/app-layout";
import HomePage from "./pages/home-page";
import SettingsPage from "./pages/settings-page";
import SheetViewerPage from "./pages/sheet-viewer-page";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      {
        path: "/",
        element: <HomePage />,
      },
      {
        path: "/sheets/:id",
        element: <SheetViewerPage />,
      },
      {
        path: "/settings",
        element: <SettingsPage />,
      },
    ],
  },
]);
