import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

export const settle = "cubic-bezier(0.16, 1, 0.3, 1)";
export function MotionWords({ children }: { children: string }) {
  return (
    <span className="motion-words" aria-label={children}>
      {children.split(" ").map((word, i) => (
        <span className="word-mask" aria-hidden="true" key={`${word}-${i}`}>
          <span className="word-body">{word}</span>
          {i < children.split(" ").length - 1 ? "\u00a0" : ""}
        </span>
      ))}
    </span>
  );
}

/** Exit and arrival share one surface; rapid selections cancel stale exits. */
export function MotionPanel({
  identity,
  children,
  compact = false,
}: {
  identity: string | number;
  children: ReactNode;
  compact?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [snapshot, setSnapshot] = useState({ identity, children });
  useLayoutEffect(() => {
    if (snapshot.identity === identity) return;
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSnapshot({ identity, children });
      return;
    }
    let active = true;
    const exit = el.animate(
      [
        { opacity: 1, transform: "none" },
        { opacity: 0, transform: "translateY(-8px)" },
      ],
      { duration: compact ? 90 : 140, easing: "ease-out", fill: "forwards" },
    );
    exit.finished
      .then(() => {
        if (active) setSnapshot({ identity, children });
      })
      .catch(() => {});
    return () => {
      active = false;
      exit.cancel();
    };
  }, [identity, snapshot.identity, children]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animation = el.animate(
      [
        { opacity: 0, transform: "translateY(18px) scale(.985)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: compact ? 240 : 640, easing: settle },
    );
    const items = [...el.children].map((child, i) =>
      child.animate(
        [
          { opacity: 0, transform: "translateY(12px)" },
          { opacity: 1, transform: "none" },
        ],
        {
          duration: compact ? 220 : 560,
          delay: compact ? Math.min(20 * i, 60) : 35 * i,
          easing: settle,
          fill: "backwards",
        },
      ),
    );
    return () => {
      animation.cancel();
      items.forEach((a) => a.cancel());
    };
  }, [snapshot.identity]);
  return (
    <div ref={ref} className="motion-panel">
      {snapshot.identity === identity ? children : snapshot.children}
    </div>
  );
}

/** Scoped route choreography; native scrolling and focus remain untouched. */
export function MotionDirector() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animations: Animation[] = [];
    let observer: IntersectionObserver | undefined;
    let frame = 0;
    let scrollFrame = 0;
    let stage: HTMLElement | null = null;
    const reveal = (el: Element, delay = 0, duration = 800) => {
      animations.push(
        el.animate(
          [
            { opacity: 0, transform: "translateY(26px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          { duration, delay, easing: settle, fill: "backwards" },
        ),
      );
    };
    const scroll = () => {
      if (scrollFrame || !stage) return;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        if (!stage) return;
        const rect = stage.getBoundingClientRect();
        const progress = Math.min(
          1,
          Math.max(0, (innerHeight - rect.top) / (innerHeight + rect.height)),
        );
        stage.style.transform = `perspective(1600px) rotateX(${(1 - progress) * 5}deg) translateY(${(1 - progress) * 18}px)`;
      });
    };
    frame = requestAnimationFrame(() => {
      const main = document.getElementById("main");
      if (!main) return;
      const words = main.querySelectorAll(
        ".public-hero .word-body, .access-copy .word-body, .hero-copy .word-body",
      );
      words.forEach((el, i) =>
        animations.push(
          el.animate(
            [
              { transform: "translateY(110%) rotate(2deg)" },
              { transform: "translateY(0) rotate(0)" },
            ],
            {
              duration: 1100,
              delay: 70 + i * 65,
              easing: settle,
              fill: "backwards",
            },
          ),
        ),
      );
      const opening = main.querySelectorAll(
        ".public-hero > .eyebrow, .public-lead, .public-actions, .public-hero-bottom, .access-copy > .eyebrow, .access-copy > p, .access-panel, .page-header, .cloud-heading, .cloud-metrics, .hero-copy > div > p, .hero-cta, .hero-context",
      );
      opening.forEach((el, i) =>
        reveal(
          el,
          Math.min(i * 70, 280),
          pathname.startsWith("/app") ? 420 : 850,
        ),
      );
      observer = new IntersectionObserver(
        (entries) =>
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            reveal(el, 0, 900);
            el.querySelectorAll(
              "h2, .feature-row, .stage-stat, .workflow-steps button",
            ).forEach((item, i) => reveal(item, Math.min(i * 65, 240), 700));
            observer?.unobserve(el);
          }),
        { threshold: 0.12 },
      );
      main
        .querySelectorAll(
          ".public-product, .public-workflow, .public-statement, .public-questions, .public-final, .public-features",
        )
        .forEach((el) => observer?.observe(el));
      const workspace = main.querySelectorAll(
        ".network-portrait, .overview-columns > *, .supplier-table, .detail-content > *, .content-panel, .detail-section",
      );
      workspace.forEach((el, i) => reveal(el, Math.min(i * 35, 140), 420));
      stage = main.querySelector<HTMLElement>(".product-stage");
      if (stage) {
        window.addEventListener("scroll", scroll, { passive: true });
        scroll();
      }
    });
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(scrollFrame);
      observer?.disconnect();
      window.removeEventListener("scroll", scroll);
      animations.forEach((a) => a.cancel());
      if (stage) stage.style.transform = "";
    };
  }, [pathname]);
  return null;
}
