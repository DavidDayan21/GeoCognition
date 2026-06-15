import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { bootstrapTheme } from "./lib/theme";
import "./i18n";
import { bootstrapLanguage } from "./lib/language";
import "./styles/globals.css";

// Apply the cached theme and language before first paint to avoid a flash of
// the wrong one. The persisted settings load (async) re-syncs both shortly
// after mount.
bootstrapTheme();
bootstrapLanguage();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found in index.html");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
