import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Building2,
  Check,
  FileText,
  ShieldCheck,
} from "lucide-react";

const chapters = [
  {
    word: "Scattered.",
    title: "The information exists.",
    text: "In inboxes. In folders. Across your supplier network.",
  },
  {
    word: "Structured.",
    title: "Give every detail a place.",
    text: "Company information, evidence and requirements. Connected to one supplier.",
  },
  {
    word: "In focus.",
    title: "Know your next step.",
    text: "See the missing information. Review the evidence. Move forward with context.",
  },
];
const evidence = [
  ["ISO 9001", "QUALITY MANAGEMENT", "Certificate"],
  ["REACH", "MATERIAL COMPLIANCE", "Declaration"],
  ["Company register", "COMPANY IDENTITY", "Registration"],
  ["ISO 14001", "ENVIRONMENTAL MANAGEMENT", "Certificate"],
  ["Material details", "PRODUCT INFORMATION", "Specification"],
  ["Contact details", "YOUR CONNECTION", "Company"],
];

/** Relay's signature: the same pieces of evidence become one considered identity. */
export function SignatureScene() {
  const root = useRef<HTMLElement>(null);
  const jump = useRef<(index: number) => void>(() => {});
  const [chapter, setChapter] = useState(0);
  useLayoutEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    Promise.all([import("gsap"), import("gsap/ScrollTrigger")])
      .then(([{ gsap }, { ScrollTrigger }]) => {
        if (disposed || !root.current) return;
        gsap.registerPlugin(ScrollTrigger);
        const media = gsap.matchMedia();
        const build = (mobile: boolean) => {
          const host = root.current!;
          const cards = host.querySelectorAll(".evidence-card");
          const words = host.querySelectorAll(".scene-word");
          const captions = host.querySelectorAll(".scene-caption");
          const spread = mobile ? 0.48 : 1;
          const offsets = [
            [-350, -80, -12],
            [340, -55, 12],
            [-290, 100, 7],
            [310, 105, -8],
            [-30, -140, 4],
            [15, 130, -5],
          ];
          cards.forEach((card, i) =>
            gsap.set(card, {
              x: offsets[i][0] * spread,
              y: offsets[i][1] * (mobile ? 0.7 : 1),
              rotation: offsets[i][2],
              scale: mobile ? 0.72 : 1,
            }),
          );
          gsap.set(words, { autoAlpha: 0, yPercent: 30 });
          gsap.set(captions, { autoAlpha: 0, y: 12 });
          gsap.set(words[0], { autoAlpha: 1, yPercent: 0 });
          gsap.set(captions[0], { autoAlpha: 1, y: 0 });
          gsap.set(host.querySelector(".scene-identity"), {
            autoAlpha: 0,
            scale: 0.94,
            y: 36,
          });
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: host,
              start: "top 80px",
              end: "bottom bottom",
              scrub: mobile ? 0.8 : 1.05,
              invalidateOnRefresh: true,
            },
          });
          tl.eventCallback("onUpdate", () => {
            const progress = tl.progress();
            const next = progress < 0.26 ? 0 : progress < 0.7 ? 1 : 2;
            setChapter((prev) => (prev === next ? prev : next));
          });
          tl.to({}, { duration: 0.35 });
          cards.forEach((card, i) =>
            tl.to(
              card,
              {
                x: (i % 2 === 0 ? -290 : 290) * spread,
                y: (Math.floor(i / 2) - 1) * (mobile ? 95 : 126),
                rotation: 0,
                scale: mobile ? 0.65 : 0.86,
                duration: 1,
                ease: "power3.inOut",
              },
              0.35 + i * 0.025,
            ),
          );
          tl.to(
            host.querySelector(".scene-identity"),
            {
              autoAlpha: 1,
              scale: 1,
              y: 0,
              duration: 1.15,
              ease: "power2.inOut",
            },
            0.85,
          )
            .to(
              host.querySelector(".scene-lines"),
              { opacity: 0.55, duration: 0.7 },
              0.7,
            )
            .to(
              [words[0], captions[0]],
              { autoAlpha: 0, y: -12, duration: 0.3 },
              0.5,
            )
            .to(
              [words[1], captions[1]],
              { autoAlpha: 1, y: 0, yPercent: 0, duration: 0.5 },
              0.85,
            )
            .to({}, { duration: 0.55 });
          cards.forEach((card, i) =>
            tl.to(
              card,
              {
                x: (i - 2.5) * (mobile ? 24 : 36),
                y: -12 - i * 5,
                rotation: (i - 2.5) * 2,
                scale: mobile ? 0.68 : 0.84,
                opacity: 0.52,
                duration: 0.9,
                ease: "power3.inOut",
              },
              2.1 + i * 0.02,
            ),
          );
          tl.to(
            host.querySelector(".scene-identity"),
            { scale: 1.035, duration: 0.9, ease: "power3.inOut" },
            2.1,
          )
            .to(
              host.querySelector(".scene-lines"),
              { opacity: 0, duration: 0.5 },
              2.1,
            )
            .to(
              [words[1], captions[1]],
              { autoAlpha: 0, y: -12, duration: 0.3 },
              2.12,
            )
            .to(
              [words[2], captions[2]],
              { autoAlpha: 1, y: 0, yPercent: 0, duration: 0.5 },
              2.45,
            )
            .fromTo(
              host.querySelectorAll(".identity-row"),
              { opacity: 0.35, x: 8 },
              { opacity: 1, x: 0, stagger: 0.07, duration: 0.5 },
              2.45,
            )
            .to({}, { duration: 0.5 });
          jump.current = (index) => {
            const trigger = tl.scrollTrigger;
            if (trigger)
              window.scrollTo({
                top:
                  trigger.start +
                  (trigger.end - trigger.start) * [0.06, 0.52, 0.94][index],
                behavior: "smooth",
              });
          };
          const world = host.querySelector<HTMLElement>(".scene-world");
          if (
            !mobile &&
            world &&
            matchMedia("(hover: hover) and (pointer: fine)").matches
          ) {
            const rotateY = gsap.quickTo(world, "rotationY", {
              duration: 0.7,
              ease: "power3.out",
            });
            const rotateX = gsap.quickTo(world, "rotationX", {
              duration: 0.7,
              ease: "power3.out",
            });
            const move = (event: PointerEvent) => {
              const rect = world.getBoundingClientRect();
              rotateY(((event.clientX - rect.left) / rect.width - 0.5) * 3);
              rotateX(-((event.clientY - rect.top) / rect.height - 0.5) * 2);
            };
            const release = () => {
              rotateY(0);
              rotateX(0);
            };
            world.addEventListener("pointermove", move, { passive: true });
            world.addEventListener("pointerleave", release);
            return () => {
              world.removeEventListener("pointermove", move);
              world.removeEventListener("pointerleave", release);
            };
          }
        };
        media.add(
          "(prefers-reduced-motion: no-preference) and (min-width: 1000px)",
          () => build(false),
          root.current,
        );
        media.add(
          "(prefers-reduced-motion: no-preference) and (max-width: 999px)",
          () => build(true),
          root.current,
        );
        media.add(
          "(prefers-reduced-motion: reduce)",
          () => {
            setChapter(2);
            jump.current = () => {};
          },
          root.current,
        );
        cleanup = () => media.revert();
      })
      .catch(() => {
        if (!disposed) setChapter(2);
      });
    return () => {
      disposed = true;
      cleanup?.();
      jump.current = () => {};
    };
  }, []);
  return (
    <section
      ref={root}
      className="signature-scene"
      aria-label="From scattered information to supplier clarity"
    >
      <div className="signature-stage">
        <div className="scene-topline">
          <span className="eyebrow">THE RELAY PERSPECTIVE</span>
          <span className="eyebrow">INFORMATION → CONTEXT → CLARITY</span>
        </div>
        <div className="scene-title" aria-hidden="true">
          {chapters.map((c) => (
            <span className="scene-word" key={c.word}>
              {c.word}
            </span>
          ))}
        </div>
        <h2 className="sr-only">
          Scattered information. A structured supplier identity. A clear next
          step.
        </h2>
        <div className="scene-world" aria-hidden="true">
          <svg
            className="scene-lines"
            viewBox="0 0 1000 450"
            preserveAspectRatio="none"
          >
            {[100, 225, 350].flatMap((y) => [
              <path
                key={`l${y}`}
                d={`M 210 ${y} C 390 ${y}, 310 225, 500 225`}
              />,
              <path
                key={`r${y}`}
                d={`M 790 ${y} C 610 ${y}, 690 225, 500 225`}
              />,
            ])}
          </svg>
          {evidence.map(([name, type, kind], i) => (
            <div className="evidence-card" key={name}>
              <div className="evidence-top">
                <FileText size={16} />
                <span>
                  0{i + 1} / {kind}
                </span>
              </div>
              <strong>{name}</strong>
              <span className="evidence-type">{type}</span>
              <div className="evidence-lines">
                <i />
                <i />
              </div>
            </div>
          ))}
          <div className="scene-identity">
            <div className="identity-cap">
              <span className="identity-monogram">
                <Building2 size={24} strokeWidth={1.25} />
              </span>
              <span>
                SUPPLIER IDENTITY
                <br />
                <small>EXAMPLE WORKSPACE</small>
              </span>
              <ArrowUpRight size={18} />
            </div>
            <h3>
              Alpina
              <br />
              Components.
            </h3>
            <p>Austria · Precision components</p>
            <div className="identity-rule" />
            <div className="identity-row">
              <span>Company information</span>
              <Check size={15} />
            </div>
            <div className="identity-row">
              <span>Compliance evidence</span>
              <ShieldCheck size={15} />
            </div>
            <div className="identity-row">
              <span>Missing information</span>
              <span className="identity-count">01</span>
            </div>
            <div className="identity-bottom">
              <span>ONE COMPANY. A CLEARER PICTURE.</span>
              <span>↗</span>
            </div>
          </div>
        </div>
        <div className="scene-bottom">
          <div className="scene-captions">
            {chapters.map((c) => (
              <div className="scene-caption" key={c.word}>
                <h3>{c.title}</h3>
                <p>{c.text}</p>
              </div>
            ))}
          </div>
          <div
            className="scene-controls"
            aria-label="Explore the Relay perspective"
          >
            {chapters.map((c, i) => (
              <button
                type="button"
                aria-label={c.title}
                aria-pressed={chapter === i}
                onClick={() => jump.current(i)}
                key={c.word}
              >
                <i />
              </button>
            ))}
          </div>
          <Link to="/app" className="scene-demo">
            Explore the workspace <ArrowUpRight size={17} />
          </Link>
        </div>
      </div>
    </section>
  );
}
