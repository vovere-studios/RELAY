import {
  useEffect,
  useRef,
  useId,
  useState,
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
  onInvalid,
  onInput,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  const [invalid, setInvalid] = useState("");
  const messageId = useId();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const form = input.current?.form;
    const reset = () => setInvalid("");
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, []);
  return <>
    <input className={`input ${className}`} {...props} ref={input}
      aria-invalid={invalid ? true : props["aria-invalid"]}
      aria-describedby={[props["aria-describedby"], invalid ? messageId : undefined].filter(Boolean).join(" ") || undefined}
      onInvalid={event => {
        const validity = event.currentTarget.validity;
        setInvalid(validity.valueMissing ? "This field is required." : validity.typeMismatch ? "Enter a valid email address." : validity.patternMismatch ? "Check the requested format." : "Check this value.");
        onInvalid?.(event);
      }}
      onInput={event => { if (invalid) setInvalid(""); onInput?.(event); }}/>
    {invalid && <span className="field-error" id={messageId}>{invalid}</span>}
  </>;
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
export function Dialog({ open, onClose, title, children, footer, className = "", closeDisabled = false }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode;
  footer?: ReactNode; className?: string; closeDisabled?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const escapeFromMenu = useRef(false);
  const keyboard = useRef(false);
  const trigger = useRef<HTMLElement | null>(null);
  const [presentation, setPresentation] = useState({ open, key: 0 });
  // Remount before committing a fresh form, rather than changing its controlled fields in an effect.
  if (presentation.open !== open)
    setPresentation({ open, key: presentation.key + (open ? 1 : 0) });
  const session = presentation.key;
  const overflow = useRef<string | null>(null);
  const content = useRef({ title, children, footer });
  // Preserve the receipt/form through the exit. New content only enters on opening.
  if (open) content.current = { title, children, footer };
  const restoreScroll = () => {
    if (overflow.current !== null) {
      document.body.style.overflow = overflow.current;
      overflow.current = null;
    }
  };
  useEffect(() => {
    const key = () => { keyboard.current = true; };
    const pointer = () => { keyboard.current = false; };
    window.addEventListener("keydown", key, true);
    window.addEventListener("pointerdown", pointer, true);
    return () => {
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("pointerdown", pointer, true);
      restoreScroll();
    };
  }, []);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const material = dialog.querySelector<HTMLElement>(".dialog-material");
    const surface = dialog.querySelector<HTMLElement>(".dialog-surface");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animate = !reduced && !keyboard.current;
    const animations: Animation[] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;
    const originTransform = () => {
      const from = trigger.current?.isConnected ? trigger.current.getBoundingClientRect() : null;
      const to = dialog.getBoundingClientRect();
      if (!from || from.width < 24 || !to.width || !to.height) return "translateY(18px) scale(.975)";
      return `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${Math.min(1, from.width / to.width)}, ${Math.min(1, from.height / to.height)})`;
    };
    if (open) {
      if (!dialog.open) {
        trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        dialog.showModal();
      }
      dialog.dataset.state = "open";
      dialog.dataset.keyboard = String(keyboard.current);
      dialog.querySelector(".dialog-body")?.scrollTo(0, 0);
      if (overflow.current === null) overflow.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      if (animate && material && surface) {
        animations.push(material.animate([
          { transform: originTransform(), opacity: .7 },
          { transform: "none", opacity: 1 },
        ], { duration: 460, easing: "cubic-bezier(.16,1,.3,1)" }));
        animations.push(surface.animate([
          { opacity: 0, transform: "translateY(10px)" },
          { opacity: 1, transform: "none" },
        ], { duration: 240, delay: 200, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" }));
      }
    } else if (dialog.open) {
      dialog.dataset.state = "closing";
      if (animate && material && surface) {
        animations.push(surface.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 110, fill: "forwards" }));
        animations.push(material.animate([
          { transform: "none", opacity: 1 },
          { transform: originTransform(), opacity: 0 },
        ], { duration: 230, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" }));
      }
      timer = setTimeout(() => { dialog.close(); restoreScroll(); }, animate ? 230 : 0);
    }
    return () => {
      clearTimeout(timer);
      animations.forEach(animation => animation.cancel());
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      ref.current?.querySelector<HTMLElement>('.dialog-body input:not([type="hidden"]):not(:disabled), .dialog-body button:not(:disabled), .dialog-body textarea:not(:disabled)')?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [session, open]);
  return <dialog ref={ref} className={`dialog ${className}`} aria-labelledby={titleId}
    onKeyDownCapture={event => {
      if (event.key === "Escape") escapeFromMenu.current = Boolean(ref.current?.querySelector(".select-menu:popover-open"));
    }}
    onCancel={event => { event.preventDefault(); if (!escapeFromMenu.current && !closeDisabled) onClose(); escapeFromMenu.current = false; }}
    onClose={() => { restoreScroll(); if (open) onClose(); }}
    onClick={event => {
      if (closeDisabled || event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
    }}>
    <div className="dialog-material" aria-hidden="true"/>
    <div className="dialog-surface">
      <div className="dialog-header"><h2 id={titleId}>{content.current.title}</h2>
        <Button variant="ghost" aria-label="Close dialog" disabled={closeDisabled} onClick={onClose}><X size={19}/></Button>
      </div>
      <div className="dialog-body" key={session}>{content.current.children}</div>
      {content.current.footer && <div className="dialog-footer">{content.current.footer}</div>}
    </div>
  </dialog>;
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
