import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { MotionDirector } from "./components/Motion";
import { RouteFocus } from "./components/RouteFocus";
import { Shell } from "./components/Shell";
import { FeedbackProvider } from "./components/Feedback";
import { WorkspaceProvider } from "./data/Workspace";
import { Website } from "./pages/marketing/Website";
import { Access } from "./pages/marketing/Access";
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
import { Overview } from "./pages/Overview";
import { Suppliers } from "./pages/Suppliers";
import { SupplierDetail } from "./pages/SupplierDetail";
import {
  ActivityPage,
  Documents,
  NotFound,
  Organization,
  Products,
  Requests,
} from "./pages/WorkspacePages";
export function App() {
  return (
    <BrowserRouter>
      <WorkspaceProvider>
        <FeedbackProvider>
          <Suspense
            fallback={
              <main
                id="main"
                tabIndex={-1}
                className="route-pending"
                role="status"
              >
                <span className="wordmark">relay ↗</span>
                <p>Opening your workspace…</p>
              </main>
            }
          >
            <Routes>
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
              <Route path="preview-setup" element={<Access mode="signup" />} />
              <Route path="website" element={<Navigate to="/" replace />} />
              <Route path="app" element={<Shell />}>
                <Route index element={<Overview />} />
                <Route path="suppliers" element={<Suppliers />} />
                <Route path="suppliers/:id" element={<SupplierDetail />} />
                <Route path="documents" element={<Documents />} />
                <Route path="requests" element={<Requests />} />
                <Route path="products" element={<Products />} />
                <Route path="organization" element={<Organization />} />
                <Route path="activity" element={<ActivityPage />} />
                <Route path="*" element={<NotFound />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <RouteFocus />
            <MotionDirector />
          </Suspense>
        </FeedbackProvider>
      </WorkspaceProvider>
    </BrowserRouter>
  );
}
