import { useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export function RouteFocus() {
  const { pathname, search } = useLocation();
  const previous = useRef<{ pathname: string; search: string } | null>(null);
  useLayoutEffect(() => {
    const before = previous.current;
    const oldParams = new URLSearchParams(before?.search);
    const nextParams = new URLSearchParams(search);
    const withinSupplier = pathname === "/cloud" && before?.pathname === pathname &&
      !!nextParams.get("supplier") && oldParams.get("supplier") === nextParams.get("supplier") &&
      oldParams.get("org") === nextParams.get("org");
    previous.current = { pathname, search };
    const main = document.getElementById("main");
    if (!withinSupplier) {
      window.scrollTo({ top: 0, behavior: "instant" });
      main?.focus({ preventScroll: true });
    }
    // Async workspace data can replace the placeholder heading after navigation.
    const updateTitle = () => {
      const heading = main?.querySelector("h1");
      const title = `${heading?.innerText.replace(/\s+/g, " ").replace(/\.$/, "") || "Workspace"} — Relay`;
      if (document.title !== title) document.title = title;
    };
    updateTitle();
    const observer = new MutationObserver(updateTitle);
    if (main) observer.observe(main, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [pathname, search]);
  return null;
}
