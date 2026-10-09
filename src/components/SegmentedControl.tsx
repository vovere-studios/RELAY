import { useLayoutEffect, useRef } from 'react';
import { reducedMotion, springEasing } from '../lib/motion';

type Option = { value: string; label: string; dirty?: boolean };

/** The selected material travels; labels and content remain readable and immediately interactive. */
export function SegmentedControl({ value, options, onChange, label, className = '' }: {
  value: string; options: Option[]; onChange: (value: string) => void; label: string; className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const lens = useRef<HTMLSpanElement>(null);
  const animation = useRef<Animation | null>(null);
  const ready = useRef(false);
  const previous = useRef(value);
  const signature = options.map(option => option.value).join('|');
  useLayoutEffect(() => {
    const container = root.current!;
    const capsule = lens.current!;
    const position = (animate: boolean) => {
      const selected = container.querySelector<HTMLButtonElement>('button[aria-pressed="true"]');
      if (!selected) return;
      const current = capsule.getBoundingClientRect();
      animation.current?.cancel();
      const origin = container.getBoundingClientRect();
      const target = selected.getBoundingClientRect();
      const style = getComputedStyle(container);
      capsule.style.left = `${target.left - origin.left + container.scrollLeft - parseFloat(style.borderLeftWidth)}px`;
      capsule.style.top = `${target.top - origin.top + container.scrollTop - parseFloat(style.borderTopWidth)}px`;
      capsule.style.width = `${target.width}px`;
      capsule.style.height = `${target.height}px`;
      if (animate && ready.current && !reducedMotion() && current.width && current.height) {
        animation.current = capsule.animate([
          { transform: `translate(${current.left - target.left}px,${current.top - target.top}px) scale(${current.width / target.width},${current.height / target.height})` },
          { transform: 'none' },
        ], { duration: 460, easing: springEasing(), composite: 'replace' });
      }
      capsule.dataset.ready = 'true';
      ready.current = true;
    };
    position(previous.current !== value);
    previous.current = value;
    let initialDelivery = true;
    const observer = new ResizeObserver(() => {
      if (initialDelivery) { initialDelivery = false; return; }
      position(false);
    });
    observer.observe(container);
    container.querySelectorAll('button').forEach(button => observer.observe(button));
    return () => observer.disconnect();
  }, [value, signature]);
  useLayoutEffect(() => () => animation.current?.cancel(), []);
  return <div ref={root} className={`segmented-control ${className}`} role="group" aria-label={label}
    onKeyDown={event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const buttons = [...root.current!.querySelectorAll('button')];
      const index = buttons.indexOf(event.target as HTMLButtonElement);
      if (index < 0) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next].focus({ preventScroll: true });
      onChange(options[next].value);
    }}>
    <span ref={lens} className="selection-lens" aria-hidden="true"/>
    {options.map(option => <button key={option.value} type="button" aria-pressed={value === option.value}
      data-dirty={option.dirty || undefined} aria-label={`${option.label}${option.dirty ? ', unsaved changes' : ''}`}
      onClick={() => onChange(option.value)}>{option.label}</button>)}
  </div>;
}
