import { createBrowserRouter } from "react-router-dom";
import HomePage from "./pages/home-page";
import SheetViewerPage from "./pages/sheet-viewer-page";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/sheets/:id",
    element: <SheetViewerPage />,
  },
]);
