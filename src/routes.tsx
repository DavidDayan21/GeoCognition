import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import BorderRunPage from "./pages/BorderRunPage";
import HomePage from "./pages/HomePage";
import PracticePage from "./pages/PracticePage";
import StatsPage from "./pages/StatsPage";
import SettingsPage from "./pages/SettingsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "practice", element: <PracticePage /> },
      { path: "border-run", element: <BorderRunPage /> },
      { path: "stats", element: <StatsPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);
