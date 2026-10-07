import { lazy, Suspense, type ReactNode } from "react";
import { ClientOnly, HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import perspectiveCss from "../styles/perspective.css?url";
import refinementCss from "../styles/refinement.css?url";
import connectedCss from "../styles/connected.css?url";
const RelayApp = lazy(() => import("../App").then(module => ({ default: module.App })));
function Loading() { return <main className="route-pending" role="status"><span className="wordmark">relay ↗</span><p>Opening Relay…</p></main>; }
export const Route = createRootRoute({
  head: () => ({
    meta: [{ charSet: "utf-8" }, { name: "viewport", content: "width=device-width, initial-scale=1" }, { title: "Relay — Supplier workspace" }, { name: "description", content: "Relay — structured supplier information, connected. A product of VOVERE Studios." }, { name: "theme-color", content: "#fafafa" }],
    links: [appCss, perspectiveCss, refinementCss, connectedCss].map(href => ({ rel: "stylesheet", href })).concat([{ rel: "icon", href: "/favicon.svg" }]),
  }),
  shellComponent: RootShell,
  component: RootComponent,
});
function RootShell({children}:{children:ReactNode}) { return <html lang="en" suppressHydrationWarning><head><HeadContent/><script dangerouslySetInnerHTML={{__html:'try{document.documentElement.dataset.theme=localStorage.getItem("relay-theme")||"light"}catch{}'}}/></head><body>{children}<Scripts/></body></html>; }
function RootComponent() { return <><ClientOnly fallback={<Loading/>}><Suspense fallback={<Loading/>}><RelayApp/></Suspense></ClientOnly><Outlet/></>; }
