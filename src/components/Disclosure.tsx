import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { reducedMotion, springEasing } from '../lib/motion';

/** Native details semantics with a measured, interruptible expansion, including browsers without auto-height interpolation. */
export function Disclosure({ title, children }: { title: string; children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const [present, setPresent] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const frame = useRef<{ height: string; opacity: string } | null>(null);
  useLayoutEffect(() => {
    const element = body.current;
    if (!element || !inner.current || !present) return;
    if (reducedMotion()) { frame.current = null; setPresent(expanded); return; }
    let active = true;
    const height = inner.current.getBoundingClientRect().height;
    const animation = element.animate([
      frame.current || { height: expanded ? '0px' : `${height}px`, opacity: expanded ? 0 : 1 },
      { height: expanded ? `${height}px` : '0px', opacity: expanded ? 1 : 0 },
    ], { duration: expanded ? 420 : 180, easing: expanded ? springEasing(420, 26, 260) : 'ease-in', fill: 'both' });
    animation.finished.then(() => {
      if (!active) return;
      frame.current = null;
      if (!expanded) setPresent(false);
      else animation.cancel();
    }).catch(() => {});
    return () => {
      active = false;
      if (animation.playState === 'running') {
        const style = getComputedStyle(element);
        frame.current = { height: style.height, opacity: style.opacity };
      }
      animation.cancel();
    };
  }, [expanded, present]);
  return <details className="motion-disclosure" open={expanded || present} data-closing={!expanded && present || undefined}>
    <summary onClick={event=>{event.preventDefault();setPresent(true);setExpanded(previous=>!previous);}}>
      <span>{title}</span><ChevronDown size={18} strokeWidth={1.65} aria-hidden="true"/>
    </summary>
    <div className="disclosure-body" ref={body}><div ref={inner}>{children}</div></div>
  </details>;
}
