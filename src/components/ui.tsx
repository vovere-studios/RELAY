import {
  useEffect,
  useRef,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Link, NavLink } from "react-router-dom";
import { ArrowUpRight, X, type LucideIcon } from "lucide-react";
import type { SupplierStatus } from "../domain/types";
export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <button className={`button button-${variant} ${className}`} {...props} />
  );
}
export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`input ${className}`} {...props} />;
}
export function LoadingIndicator({ label = "Working…", compact = false }: { label?: string; compact?: boolean }) {
 return <span className={`relay-loading ${compact ? 'is-compact' : ''}`} role="status"><span className="relay-loading-track" aria-hidden="true"><i /><i /><i /></span><span>{label}</span></span>;
}
export function Badge({ children }: { children: ReactNode }) {
  return <span className="badge">{children}</span>;
}
const labels: Record<SupplierStatus, string> = {
  complete: "Complete",
  missing: "Missing information",
  attention: "Attention",
};
export function Status({
  status,
  label,
}: {
  status: SupplierStatus;
  label?: string;
}) {
  return (
    <span className={`status status-${status}`}>
      <span aria-hidden="true" />
      {label ?? labels[status]}
    </span>
  );
}
export function NavigationItem({
  to,
  icon: Icon,
  children,
  count,
  onClick,
}: {
  to: string;
  icon: LucideIcon;
  children: ReactNode;
  count?: number;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={to === "/app"}
      onClick={onClick}
      className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
    >
      <Icon size={17} strokeWidth={1.6} />
      <span>{children}</span>
      {count !== undefined && <span className="nav-count">{count}</span>}
    </NavLink>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {action}
    </header>
  );
}
export function SectionHeader({
  number,
  title,
  to,
  linkLabel = "View all",
}: {
  number?: string;
  title: string;
  to?: string;
  linkLabel?: string;
}) {
  return (
    <div className="section-header">
      <h2>
        {number && <span className="section-index">{number}</span>}
        {title}
      </h2>
      {to && (
        <Link className="text-link" to={to}>
          {linkLabel}
          <ArrowUpRight size={15} />
        </Link>
      )}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-mark" aria-hidden="true">
        ↗
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function ListRow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`list-row ${className}`}>{children}</div>;
}
export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const escapeFromMenu = useRef(false);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      dialog.dataset.state = "open";
      if (!dialog.open) dialog.showModal();
      const animations: Animation[] = [];
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        animations.push(
          dialog.animate(
            [
              {
                opacity: 0,
                transform:
                  "perspective(1200px) translateY(18px) scale(.98) rotateX(2deg)",
              },
              {
                opacity: 1,
                transform:
                  "perspective(1200px) translateY(0) scale(1) rotateX(0)",
              },
            ],
            { duration: 340, easing: "cubic-bezier(.16,1,.3,1)" },
          ),
        );
        dialog
          .querySelectorAll(
            ".dialog-header, form > label, form > .form-grid, form > .button, .dialog-footnote, .notification-item",
          )
          .forEach((el, i) => {
            animations.push(
              el.animate(
                [
                  { opacity: 0, transform: "translateY(10px)" },
                  { opacity: 1, transform: "none" },
                ],
                {
                  duration: 240,
                  delay: 30 + Math.min(i * 20, 80),
                  easing: "cubic-bezier(.16,1,.3,1)",
                  fill: "backwards",
                },
              ),
            );
          });
      }
      const overflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        animations.forEach((a) => a.cancel());
        document.body.style.overflow = overflow;
      };
    }
    if (dialog.open) {
      dialog.dataset.state = "closing";
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const timer = setTimeout(() => dialog.close(), reduced ? 0 : 180);
      return () => clearTimeout(timer);
    }
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      onKeyDownCapture={(event) => {
        if (event.key === "Escape") escapeFromMenu.current = Boolean(ref.current?.querySelector(".select-menu:popover-open"));
      }}
      onCancel={(event) => {
        event.preventDefault();
        if (!escapeFromMenu.current) onClose();
        escapeFromMenu.current = false;
      }}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            onClose();
        }
      }}
    >
      <div className="dialog-header">
        <h2 id={titleId}>{title}</h2>
        <Button variant="ghost" aria-label="Close dialog" onClick={onClose}>
          <X size={20} />
        </Button>
      </div>
      {children}
    </dialog>
  );
}
export function Progress({ value }: { value: number }) {
  return (
    <span
      className="progress"
      role="meter"
      aria-label="Data completeness"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <span style={{ width: `${value}%` }} />
    </span>
  );
}
