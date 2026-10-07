import { WorkspaceSearch } from "./WorkspaceSearch";
import { useEffect, useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  Building2,
  ArrowUpRight,
  Files,
  Package,
  SlidersHorizontal,
  Sun,
  Moon,
  Menu,
  X,
  ChevronDown,
  ArrowDownLeft,
} from "lucide-react";
import { Notifications } from "./Notifications";
import { Badge, Button, Dialog, NavigationItem } from "./ui";
import { brand } from "../lib/brand";
import { useWorkspace } from "../data/Workspace";

const navigation = [
  { to: "/app", label: "Overview", icon: LayoutGrid },
  {
    to: "/app/suppliers",
    label: "Suppliers",
    icon: Building2,
    count: 0,
  },
  { to: "/app/requests", label: "Requests", icon: ArrowUpRight, count: 1 },
  { to: "/app/documents", label: "Documents", icon: Files },
  { to: "/app/products", label: "Products", icon: Package },
  { to: "/app/organization", label: "Organization", icon: SlidersHorizontal },
];
export function Shell() {
  const {
    storageError,
    requests,
    currentUser,
    organization,
    supplierRows,
    networkStats,
  } = useWorkspace();
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    if (!menu) return;
    const sidebar = document.getElementById("workspace-navigation");
    const trigger = document.querySelector<HTMLButtonElement>(".mobile-menu");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebar?.querySelector<HTMLButtonElement>(".mobile-close")?.focus();
    const media = window.matchMedia("(max-width: 760px)");
    const onResize = () => {
      if (!media.matches) setMenu(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
      if (event.key !== "Tab") return;
      const controls = [
        ...(sidebar?.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled])",
        ) ?? []),
      ].filter((el) => el.getClientRects().length > 0);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    media.addEventListener("change", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      media.removeEventListener("change", onResize);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [menu]);
  const [help, setHelp] = useState(false);
  const [workspace, setWorkspace] = useState(false);
  const [theme, setTheme] = useState(
    document.documentElement.dataset.theme || "light",
  );
  const location = useLocation();
  const supplier = location.pathname.startsWith("/app/suppliers/")
    ? supplierRows.find(
        (r) => r.supplier.id === location.pathname.split("/")[3],
      )?.supplier
    : undefined;
  const section =
    navigation.find(
      (n) => n.to !== "/app" && location.pathname.startsWith(n.to),
    )?.label || "Overview";
  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("relay-theme", next);
    } catch {
      /* Theme still works when storage is unavailable. */
    }
  }
  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside
        id="workspace-navigation"
        className={`sidebar ${menu ? "is-open" : ""}`}
      >
        <div className="brand-row">
          <Link to="/app" className="wordmark" aria-label="Relay overview">
            {brand.name}
            <span aria-hidden="true">↗</span>
          </Link>
          <Button
            className="mobile-close"
            variant="ghost"
            onClick={() => setMenu(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </Button>
        </div>
        <button className="workspace-switch" onClick={() => setWorkspace(true)}>
          <span className="workspace-avatar">{organization.legalName[0]}</span>
          <span>
            <strong>{organization.legalName}</strong>
            <small>Your connected workspace</small>
          </span>
          <ChevronDown size={14} />
        </button>
        <p className="nav-label eyebrow">Workspace</p>
        <nav aria-label="Main navigation">
          {navigation.map((item) => {
            const n = {
              ...item,
              count:
                item.label === "Suppliers"
                  ? networkStats.total
                  : item.label === "Requests"
                    ? requests.filter((r) => r.status === "open").length
                    : item.count,
            };
            return (
              <NavigationItem key={n.to} {...n} onClick={() => setMenu(false)}>
                {n.label}
              </NavigationItem>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="workspace-note">
            <ArrowDownLeft size={19} />
            <p>
              Clarity,
              <br />
              connected.
            </p>
            <span>Connected by Relay.</span>
          </div>
          <button className="help-link" onClick={() => setHelp(true)}>
            About this workspace <ArrowUpRight size={14} />
          </button>
          <div className="user-row">
            <span className="user-avatar">
              {currentUser.name
                .split(" ")
                .map((part) => part[0])
                .slice(0, 2)
                .join("")}
            </span>
            <div>
              <strong>{currentUser.name}</strong>
              <small>Workspace owner</small>
            </div>
            <button
              className="icon-button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            >
              {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
            </button>
          </div>
          <Link className="attribution studio-link" to="/">
            {brand.attribution}
            <ArrowUpRight size={11} />
          </Link>
        </div>
      </aside>
      {menu && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="main-shell" inert={menu}>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              aria-expanded={menu}
              aria-controls="workspace-navigation"
              onClick={() => setMenu(true)}
            >
              <Menu size={21} />
            </button>
            <span>Workspace</span>
            <span className="crumb-separator">/</span>
            <Link to={supplier ? "/app/suppliers" : location.pathname}>
              {section}
            </Link>
            {supplier && (
              <>
                <span className="crumb-separator">/</span>
                <span className="detail-crumb">{supplier.legalName}</span>
              </>
            )}
          </div>
          <div className="topbar-right">
            <WorkspaceSearch />
            <Notifications />
            <span className="connection-indicator" />
            <span className="demo-label">Local workspace</span>
            <Badge>EARLY ACCESS</Badge>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {storageError && (
            <p className="form-error" role="alert">
              Browser storage is unavailable. Recent changes cannot survive a
              reload.
            </p>
          )}
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>{brand.description}</span>
          <span>RELAY / V.01</span>
        </footer>
      </div>
      <Dialog
        open={help}
        onClose={() => setHelp(false)}
        title="A foundation for connection."
      >
        <p>
          Relay brings supplier identities, company information and compliance
          documents into one structured workspace.
        </p>
        <p>
          This local prototype uses example data dated 7 October 2026. No emails
          are sent and no files or supplier information are stored remotely.
        </p>
        <p className="eyebrow">{brand.attribution}</p>
      </Dialog>
      <Dialog
        open={workspace}
        onClose={() => setWorkspace(false)}
        title="Your workspace"
      >
        <p>
          <strong>{organization.legalName}</strong>
        </p>
        <p>
          Company details are saved locally. Shared organizations and
          memberships follow with the hosted connection. Organization settings
          and company information are available below.
        </p>
        <Link
          className="button button-primary"
          to="/app/organization"
          onClick={() => setWorkspace(false)}
        >
          View organization <ArrowUpRight size={16} />
        </Link>
      </Dialog>
    </div>
  );
}
