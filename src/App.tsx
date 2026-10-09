import { LoadingIndicator } from './components/ui';
import { lazy, Suspense } from "react";
import { createBrowserRouter, createRoutesFromElements, Navigate, Outlet, Route, RouterProvider } from "react-router-dom";
import { MotionDirector } from "./components/Motion";
import { RouteFocus } from "./components/RouteFocus";
import { ThemeProvider } from "./lib/theme";
import { FeedbackProvider } from "./components/Feedback";

import { Website } from "./pages/marketing/Website";

const CloudAccount = lazy(() =>
  import("./pages/Cloud").then((module) => ({ default: module.CloudAccount })),
);
const CloudWorkspace = lazy(() =>
  import("./pages/ConnectedWorkspace").then((module) => ({
    default: module.ConnectedWorkspace,
  })),
);
const AccountSecurity = lazy(() =>
  import("./pages/AccountSecurity").then((m) => ({
    default: m.AccountSecurity,
  })),
);
const Intake = lazy(() =>
  import("./pages/Intake").then((m) => ({ default: m.Intake })),
);
const JoinWorkspace = lazy(() =>
  import("./pages/Intake").then((m) => ({ default: m.JoinWorkspace })),
);
const PlatformAdmin = lazy(() => import("./pages/PlatformAdmin").then(module=>({default:module.PlatformAdmin})));
const Demo = lazy(() => import("./pages/Demo").then(module => ({default:module.Demo})));
function AppLayout() {
  return <ThemeProvider><FeedbackProvider><Suspense fallback={<main id="main" tabIndex={-1} className="route-pending" role="status"><span className="wordmark">relay ↗</span><LoadingIndicator label="Opening your workspace…"/></main>}>
    <Outlet/><RouteFocus/><MotionDirector/>
  </Suspense></FeedbackProvider></ThemeProvider>;
}
let relayRouter: ReturnType<typeof createBrowserRouter> | undefined;
if (import.meta.hot) import.meta.hot.dispose(() => relayRouter?.dispose());
export function App() {
  relayRouter ??= createBrowserRouter(createRoutesFromElements(
    <Route element={<AppLayout/>}>

              <Route index element={<Website />} />
              <Route
                path="signup"
                element={<CloudAccount key="signup" signup />}
              />
              <Route path="login" element={<CloudAccount key="login" />} />
              <Route path="account" element={<CloudAccount />} />
              <Route
                path="reset-password"
                element={<AccountSecurity recovery />}
              />
              <Route path="submit" element={<Intake />} />
              <Route path="join" element={<JoinWorkspace />} />
              <Route path="account-security" element={<AccountSecurity />} />
              <Route path="cloud" element={<CloudWorkspace />} />
              <Route path="admin" element={<PlatformAdmin />} />
              <Route path="preview-setup" element={<Navigate to="/signup" replace />} />
              <Route path="website" element={<Navigate to="/" replace />} />
              <Route path="app/*" element={<Demo />} />
              <Route path="*" element={<Navigate to="/" replace />} />

    </Route>
  ));
  return <RouterProvider router={relayRouter}/>;
}
