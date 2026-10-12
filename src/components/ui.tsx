import {
  useEffect,
  useRef,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { Link, NavLink } from "react-router-dom";
import { ArrowUpRight, X, type LucideIcon } from "lucide-react";
import type { SupplierStatus } from "../domain/types";
import { springEasing } from "../lib/motion";
export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  ref?: Ref<HTMLButtonElement>;
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
  const [showMessage, setShowMessage] = useState(true);
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
      aria-describedby={[props["aria-describedby"], invalid && showMessage ? messageId : undefined].filter(Boolean).join(" ") || undefined}
      onInvalid={event => {
        const validity = event.currentTarget.validity;
        // A form-level message already names the affected fields; keep the field border, avoid duplicates.
        setShowMessage(!event.defaultPrevented);
        setInvalid(validity.valueMissing ? "This field is required." : validity.typeMismatch ? "Enter a valid email address." : validity.patternMismatch ? "Check the requested format." : "Check this value.");
        onInvalid?.(event);
      }}
      onInput={event => { if (invalid) setInvalid(""); onInput?.(event); }}/>
    {invalid && showMessage && <span className="field-error" id={messageId}>{invalid}</span>}
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
let modalScrollLocks = 0;
let modalBodyOverflow = "";
let modalReturnFocus: HTMLElement | null = null;

export function Dialog({ open, onClose, title, heading, children, footer, className = "", closeDisabled = false, motion = "surface", id }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode;
  heading?: ReactNode; footer?: ReactNode; className?: string; closeDisabled?: boolean;
  motion?: "surface" | "sheet" | "inspector";
  id?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const escapeFromMenu = useRef(false);
  const keyboard = useRef(false);
  const trigger = useRef<HTMLElement | null>(null);
  const pointerTrigger = useRef<{ element: HTMLElement; time: number } | null>(null);
  const openingTransform = useRef("translateY(20px) scale(.91)");
  const [presentation, setPresentation] = useState({ open, key: 0 });
  // Remount before committing a fresh form, rather than changing its controlled fields in an effect.
  if (presentation.open !== open)
    setPresentation({ open, key: presentation.key + (open ? 1 : 0) });
  const session = presentation.key;
  const scrollLocked = useRef(false);
  const motionFrame = useRef<{ transform: string; opacity: string } | null>(null);
  const content = useRef({ title, heading, children, footer });
  // Preserve the receipt/form through the exit. New content only enters on opening.
  if (open) content.current = { title, heading, children, footer };
  const restoreScroll = () => {
    if (scrollLocked.current) {
      scrollLocked.current = false;
      modalScrollLocks = Math.max(0, modalScrollLocks - 1);
      if (!modalScrollLocks) {
        document.body.style.overflow = modalBodyOverflow;
        const target = modalReturnFocus;
        modalReturnFocus = null;
        if (target?.isConnected && target !== document.body && target.getClientRects().length && !target.closest("dialog:not([open]), [inert]"))
          target.focus({ preventScroll: true });
        else document.getElementById("main")?.focus({ preventScroll: true });
      }
    }
  };
  useEffect(() => {
    const key = () => { keyboard.current = true; };
    const pointer = (event: PointerEvent) => {
      keyboard.current = false;
      // Safari doesn't focus every clicked button. Keep its actual origin for motion and focus return.
      if (!ref.current?.open && event.target instanceof Element) {
        const element = event.target.closest<HTMLElement>('button,a,[role="button"]');
        pointerTrigger.current = element ? { element, time: performance.now() } : null;
      }
    };
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
    const animate = !reduced;
    if (!animate) motionFrame.current = null;
    const animations: Animation[] = [];
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const originTransform = () => keyboard.current ? "none" : openingTransform.current;
    if (open) {
      if (!dialog.open) {
        const pointer = pointerTrigger.current;
        trigger.current = !keyboard.current && pointer?.element.isConnected && performance.now() - pointer.time < 800
          ? pointer.element : document.activeElement instanceof HTMLElement ? document.activeElement : null;
        dialog.showModal();
        if (motion === "inspector") {
          dialog.style.transformOrigin = window.innerWidth <= 600 ? "center bottom" : "right center";
          openingTransform.current = window.innerWidth <= 600 ? "translateY(44px) scale(.97)" : "translateX(44px) scale(.97)";
        } else {
          const bounds = dialog.getBoundingClientRect();
          const origin = trigger.current?.getBoundingClientRect();
          const x = origin ? origin.left + origin.width / 2 : bounds.left + bounds.width / 2;
          const y = origin ? origin.top + origin.height / 2 : bounds.top + bounds.height / 2;
          dialog.style.transformOrigin = `${Math.max(20, Math.min(bounds.width - 20, x - bounds.left))}px ${Math.max(20, Math.min(bounds.height - 20, y - bounds.top))}px`;
          // Travel toward the source, bounded even when the initiating button is far from the form.
          const dx = Math.max(-24, Math.min(24, (x - bounds.left - bounds.width / 2) * .08));
          const dy = Math.max(-28, Math.min(28, (y - bounds.top - bounds.height / 2) * .08));
          openingTransform.current = `translate(${dx}px,${dy}px) scale(.91)`;
        }
      }
      dialog.dataset.state = "open";
      dialog.dataset.keyboard = String(keyboard.current);
      dialog.querySelector(".dialog-body")?.scrollTo(0, 0);
      if (!scrollLocked.current) {
        if (!modalScrollLocks) {
          modalBodyOverflow = document.body.style.overflow;
          modalReturnFocus = trigger.current;
        }
        modalScrollLocks++;
        scrollLocked.current = true;
      }
      document.body.style.overflow = "hidden";
      if (animate && material && surface) {
        // Material and content travel together: no empty expanding rectangle or delayed form.
        animations.push(dialog.animate([
          motionFrame.current || { transform: originTransform(), opacity: 0 },
          { transform: "none", opacity: 1 },
        ], { duration: keyboard.current ? 180 : 520, easing: keyboard.current ? "ease-out" : springEasing(520, 24, 245), fill: "both" }));
        animations[0].finished.then(() => {
          if (active) { motionFrame.current = null; animations[0].cancel(); }
        }).catch(() => {});
      }
    } else if (dialog.open) {
      dialog.dataset.state = "closing";
      if (animate && material && surface) {
        animations.push(dialog.animate([
          motionFrame.current || { transform: "none", opacity: 1 },
          { transform: originTransform(), opacity: 0 },
        ], { duration: 180, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" }));
      }
      timer = setTimeout(() => { motionFrame.current = null; dialog.close(); restoreScroll(); }, animate ? 180 : 0);
    }
    return () => {
      active = false;
      clearTimeout(timer);
      if (animations.some(animation => animation.playState === 'running')) {
        const current = getComputedStyle(dialog);
        motionFrame.current = { transform: current.transform, opacity: current.opacity };
      }
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
  return <dialog id={id} ref={ref} className={`dialog ${className}`} aria-labelledby={titleId}
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
      <div className="dialog-header"><h2 id={titleId} aria-label={content.current.heading ? content.current.title : undefined}>{content.current.heading || content.current.title}</h2>
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
