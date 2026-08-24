import { lazy, Suspense } from "react";
import { createBrowserRouter, type RouteObject } from "react-router-dom";
import { HomePage } from "../features/home/HomePage";
import { RoomPage } from "./RoomPage";

const routes: RouteObject[] = [
  { path: "/", element: <HomePage /> },
  { path: "/room/:roomId", element: <RoomPage /> },
];

// Guarded by a build-time flag (not a runtime check) so bundlers can dead-code-eliminate the
// dynamic import entirely from production output -- there is no /dev route or query-string
// backdoor available once built for production.
if (import.meta.env.DEV) {
  const DevMultiViewPage = lazy(() => import("../features/dev/DevMultiViewPage"));
  routes.push({
    path: "/dev",
    element: (
      <Suspense fallback={null}>
        <DevMultiViewPage />
      </Suspense>
    ),
  });
}

export const router = createBrowserRouter(routes);
