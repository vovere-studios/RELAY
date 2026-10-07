import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

export function RouteFocus() {
  const { pathname, search } = useLocation();
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    const main = document.getElementById("main");
    main?.focus({ preventScroll: true });
    const heading = main?.querySelector("h1");
    document.title = `${heading?.innerText.replace(/\s+/g, " ").replace(/\.$/, "") || "Workspace"} — Relay`;
  }, [pathname, search]);
  return null;
}
