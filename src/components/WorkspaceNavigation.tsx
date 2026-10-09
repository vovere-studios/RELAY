import type { ReactNode } from "react";
import { ArrowRight, LogOut, Moon, RefreshCw, Sun, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Dialog } from "./ui";

type Destination = { id: string; label: string; icon: LucideIcon };

/** A native modal owns mobile focus, outside dismissal and nested menu semantics. */
export function WorkspaceNavigation({
  open, onClose, destinations, view, organizationId, companySwitcher,
  email, fullName, avatarUrl, role, dark, onThemeChange, refreshing, onRefresh, onSignOut,
}: {
  open: boolean; onClose: () => void; destinations: Destination[]; view: string;
  organizationId?: string; companySwitcher: ReactNode; email?: string; fullName?: string; avatarUrl?: string; role?: string;
  dark: boolean; onThemeChange: () => void; refreshing: boolean;
  onRefresh: () => void; onSignOut: () => void;
}) {
  return <Dialog id="workspace-navigation" open={open} onClose={onClose} title="Workspace navigation"
    heading={<span className="navigation-wordmark">relay<span>↗</span></span>}
    className="workspace-navigation" motion="sheet"
    footer={<div className="navigation-footer">
      <div className="navigation-tools">
        <button type="button" onClick={onThemeChange} aria-label={`Switch to ${dark ? "light" : "dark"} mode`}>
          {dark ? <Sun size={17}/> : <Moon size={17}/>}<span>{dark ? "Light appearance" : "Dark appearance"}</span>
        </button>
        <button type="button" onClick={onRefresh} disabled={refreshing} aria-label="Refresh workspace">
          <RefreshCw size={17} className={refreshing ? "is-spinning" : ""}/><span>{refreshing ? "Updating…" : "Refresh"}</span>
        </button>
      </div>
      <div className="navigation-account">
        <span className="user-avatar" aria-hidden="true">{avatarUrl?<img src={avatarUrl} alt=""/>:(fullName||email)?.[0]?.toUpperCase() || "R"}</span>
        <div><strong>{fullName || email || "Your account"}</strong><small>{role === "owner" ? "Workspace owner" : role === "admin" ? "Administrator" : "Workspace member"}</small></div>
        <button type="button" className="icon-button" aria-label="Sign out" onClick={onSignOut}><LogOut size={18}/></button>
      </div>
    </div>}>
    <div className="navigation-company">{companySwitcher}</div>
    <nav aria-label="Mobile company workspace navigation">
      {[{label:"Workspace",items:destinations.slice(0,6)},{label:"Your company",items:destinations.slice(6)}].map(group =>
        <div className="navigation-group" key={group.label}>
          <p className="navigation-group-label">{group.label}</p>
          {group.items.map(({id,label,icon:Icon}) => <Link key={id}
            to={`/cloud?view=${id}${organizationId ? `&org=${organizationId}` : ""}`}
            aria-current={view === id ? "page" : undefined} onClick={onClose} className="navigation-destination">
            <Icon size={18} strokeWidth={1.65}/><span>{label}</span>
            {view === id && <ArrowRight size={15} className="navigation-current-mark" aria-hidden="true"/>}
          </Link>)}
        </div>)}
    </nav>
  </Dialog>;
}
