import { useCallback, useEffect, useRef, useState, type ButtonHTMLAttributes } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "./ui";
import { reducedMotion, springEasing } from "../lib/motion";

export type ActionPhase = "idle" | "pending" | "success" | "error";

/** Each operation owns its feedback; a synchronous lock also catches double taps. */
export function useActionFeedback() {
  const [phases, setPhases] = useState<Record<string, ActionPhase>>({});
  const [versions, setVersions] = useState<Record<string, number>>({});
  const locks = useRef(new Set<string>());
  const pending = useRef(new Set<string>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      timers.current.forEach(clearTimeout);
      timers.current.clear();
    };
  }, []);
  const clear = useCallback((id: string) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);
  const reset = useCallback((id: string) => {
    if (pending.current.has(id)) return;
    clear(id);
    locks.current.delete(id);
    setPhases(previous => ({ ...previous, [id]: "idle" }));
  }, [clear]);
  const begin = useCallback((id: string) => {
    if (locks.current.has(id)) return false;
    clear(id);
    locks.current.add(id);
    pending.current.add(id);
    setPhases(previous => ({ ...previous, [id]: "pending" }));
    return true;
  }, [clear]);
  const succeed = useCallback((id: string, afterConfirmation?: () => void) => {
    if (!mounted.current) return;
    pending.current.delete(id);
    setPhases(previous => ({ ...previous, [id]: "success" }));
    clear(id);
    timers.current.set(id, setTimeout(() => {
      timers.current.delete(id);
      locks.current.delete(id);
      if (!mounted.current) return;
      afterConfirmation?.();
      setPhases(previous => ({ ...previous, [id]: "idle" }));
    }, afterConfirmation ? 1250 : 2200));
  }, [clear]);
  const fail = useCallback((id: string) => {
    locks.current.delete(id);
    pending.current.delete(id);
    clear(id);
    if (mounted.current) {
      setVersions(previous => ({...previous,[id]:(previous[id] || 0)+1}));
      setPhases(previous => ({ ...previous, [id]: "error" }));
    }
  }, [clear]);
  return { phase: (id: string): ActionPhase => phases[id] || "idle", version: (id:string) => versions[id] || 0, begin, succeed, fail, reset };
}

/** A fixed footprint lets label and icon change without moving nearby controls. */
export function ActionButton({
  phase = "idle", outcomeKey = 0, label, pendingLabel = "Saving…", successLabel = "Saved",
  errorLabel = "Try again", variant = "primary", className = "", disabled, onFocus, ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  phase?: ActionPhase;
  outcomeKey?: number;
  label: string;
  pendingLabel?: string;
  successLabel?: string;
  errorLabel?: string;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const labels = { idle: label, pending: pendingLabel, success: successLabel, error: errorLabel };
  const focusedButton = useRef<HTMLButtonElement | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!['success', 'error'].includes(phase) || reducedMotion()) return;
    const animation = button.current?.animate([
      { transform: 'scale(.985)' }, { transform: 'none' },
    ], { duration: 420, easing: springEasing(420) });
    return () => animation?.cancel();
  },[phase,outcomeKey]);
  useEffect(() => {
    // Native disabled buttons lose focus while waiting. A failed action remains retryable by keyboard.
    if (phase === "error" && document.activeElement === document.body)
      focusedButton.current?.focus({ preventScroll: true });
  }, [phase]);
  return <Button {...props} ref={button} variant={variant} className={`action-button ${className}`}
    data-phase={phase} data-outcome-run={outcomeKey} aria-label={labels[phase]} aria-busy={phase === "pending"}
    onFocus={event => { focusedButton.current = event.currentTarget; onFocus?.(event); }}
    disabled={disabled || phase === "pending" || phase === "success"}>
    <span className="action-button-labels" aria-hidden="true">
      {Object.entries(labels).map(([key, text]) => <span key={key} data-visible={phase === key}>{text}</span>)}
    </span>
    <span className="action-button-glyph" aria-hidden="true">
      <ArrowRight className="action-idle" size={16}/>
      {phase === "pending" && <span className="action-working"><i/><i/><i/></span>}
      {(phase === "success" || phase === "error") && <OutcomeMark key={`${phase}:${outcomeKey}`} tone={phase}/>}
    </span>
  </Button>;
}

/** Geometry belongs to the action. Icons stay anchored instead of flying diagonally. */
export function ActionIcon({ kind = "add" }: { kind?: "add" | "upload" | "adjust" | "request" }) {
  return <svg className={`action-icon action-icon-${kind}`} width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === "add" ? <path className="action-icon-plus" d="M12 5v14M5 12h14"/> : kind === "upload" ? <>
      <path className="action-icon-tray" d="M4 15v5h16v-5"/>
      <g className="action-icon-lift"><path d="M12 16V4m-5 5 5-5 5 5"/></g>
    </> : kind === "adjust" ? <>
      <path d="M3 6h18M3 12h18M3 18h18"/>
      <path className="action-icon-knob action-icon-knob-a" d="M8 3v6"/>
      <path className="action-icon-knob action-icon-knob-b" d="M16 9v6"/>
      <path className="action-icon-knob action-icon-knob-c" d="M10 15v6"/>
    </> : <>
      <path className="action-icon-frame" d="M9 4H4v16h16v-5"/>
      <g className="action-icon-request"><path d="M10 14 20 4m-6 0h6v6"/></g>
    </>}
  </svg>;
}

/** Original RELAY geometry: sequential drawing and a local refusal, not imported platform artwork. */
export function OutcomeMark({ tone }: { tone: "success" | "error" }) {
  return <span className="outcome-mark" data-tone={tone} aria-hidden="true">
    <svg viewBox="0 0 40 40" fill="none">
      {tone === "success" ? <g className="outcome-signature">
        <path className="outcome-signature-stroke" pathLength="1" d="M10 21L17 28L30 12"/>
      </g> : <>
        <g className="outcome-refusal"><path className="outcome-stroke" pathLength="1" d="M20 11v12"/><circle className="outcome-dot" cx="20" cy="29" r="1.7"/></g>
      </>}
    </svg>
  </span>;
}
