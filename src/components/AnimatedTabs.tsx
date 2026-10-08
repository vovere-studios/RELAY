import { useLayoutEffect, useRef } from "react";
export function AnimatedTabs({
  items,
  selected,
  onSelect,
  label,
}: {
  items: string[];
  selected: string;
  onSelect: (value: string) => void;
  label: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const host = root.current;
    if (!host) return;
    const update = () => {
      const active = host.querySelector<HTMLButtonElement>(
        '[aria-pressed="true"]',
      );
      if (!active || !indicator.current) return;
      indicator.current.style.width = `${active.offsetWidth}px`;
      indicator.current.style.height = `${active.offsetHeight}px`;
      indicator.current.style.top = "0";
      indicator.current.style.bottom = "auto";
      indicator.current.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
    };
    update();
    const resize = new ResizeObserver(update);
    resize.observe(host);
    host.querySelectorAll("button").forEach((el) => resize.observe(el));
    return () => resize.disconnect();
  }, [selected, items]);
  return (
    <div ref={root} className="detail-tabs animated-tabs" aria-label={label}>
      <span ref={indicator} className="tab-indicator" aria-hidden="true" />
      {items.map((t) => (
        <button
          type="button"
          key={t}
          aria-pressed={selected === t}
          className={selected === t ? "selected" : ""}
          onClick={() => onSelect(t)}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
