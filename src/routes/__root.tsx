import { LoadingIndicator } from '../components/ui';
import { lazy, Suspense, type ReactNode } from "react";
import { ClientOnly, HeadContent, Outlet, Scripts, createRootRoute, useRouterState } from "@tanstack/react-router";
import { StaticRouter } from "react-router-dom";
import { Website } from "../pages/marketing/Website";
import { Pricing } from '../pages/marketing/Pricing';
import billingCss from '../styles/billing.css?url';
import appCss from "../styles.css?url";
import perspectiveCss from "../styles/perspective.css?url";
import refinementCss from "../styles/refinement.css?url";
import connectedCss from "../styles/connected.css?url";
import polishCss from "../styles/polish.css?url";
import interactionsCss from "../styles/interactions.css?url";
const RelayApp = lazy(() => import("../App").then(module => ({ default: module.App })));
function Loading() { return <main className="route-pending" role="status"><span className="wordmark">relay ↗</span><LoadingIndicator label="Opening Relay…" /></main>; }
export const Route = createRootRoute({
  head: () => ({
    meta: [{ charSet: "utf-8" }, { name: "viewport", content: "width=device-width, initial-scale=1" }, { name: "theme-color", content: "#fafafa" }],
    links: [appCss, perspectiveCss, refinementCss, connectedCss, polishCss, interactionsCss, billingCss].map(href => ({ rel: "stylesheet", href })).concat([{ rel: "icon", href: "/favicon.svg" }]),
  }),
  shellComponent: RootShell,
  component: RootComponent,
});
function RootShell({children}:{children:ReactNode}) { return <html lang="en" suppressHydrationWarning><head><HeadContent/><script dangerouslySetInnerHTML={{__html:'try{const t=localStorage.getItem("relay-theme");document.documentElement.dataset.theme=t==="light"||t==="dark"?t:matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}catch{}'}}/></head><body>{children}<Scripts/></body></html>; }
function RootComponent() {
  const pathname = useRouterState({ select: state => state.location.pathname });
  // Public content is readable before JavaScript loads. Workspace sessions stay client-side.
  const fallback = pathname === "/" || pathname === '/pricing' ? <StaticRouter location={pathname}>{pathname === '/' ? <Website/> : <Pricing/>}</StaticRouter> : <Loading/>;
  return <><ClientOnly fallback={fallback}><Suspense fallback={fallback}><RelayApp/></Suspense></ClientOnly><Outlet/></>;
}
