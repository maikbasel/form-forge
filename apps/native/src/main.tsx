import { GlobalWorkerOptions } from "pdfjs-dist";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import React from "react";
import ReactDOM from "react-dom/client";
import "@repo/ui/styles/globals.css";
import App from "./app";

GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
