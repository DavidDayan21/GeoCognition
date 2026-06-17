import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import HomePage from "./pages/HomePage";

// HomePage is eager: it is the landing route and hosts the launch intro, so it
// must be in the initial bundle to paint and animate on the first frame. The
// secondary routes are code-split — this keeps their heavy dependencies
// (recharts on Stats, react-simple-maps on the map pages) out of the initial
// chunk so the intro is never blocked behind parsing them.
const PracticePage = lazy(() => import("./pages/PracticePage"));
const BorderRunPage = lazy(() => import("./pages/BorderRunPage"));
const StatsPage = lazy(() => import("./pages/StatsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

/** Minimal full-screen placeholder shown while a lazy route chunk loads. */
function RouteFallback() {
  return <div className="min-h-screen bg-bg" aria-hidden />;
}

/** Wraps a lazily-loaded route element in a Suspense boundary. */
function lazyRoute(element: React.ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "practice", element: lazyRoute(<PracticePage />) },
      { path: "border-run", element: lazyRoute(<BorderRunPage />) },
      { path: "stats", element: lazyRoute(<StatsPage />) },
      { path: "settings", element: lazyRoute(<SettingsPage />) },
    ],
  },
]);
