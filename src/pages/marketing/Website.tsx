import { ProductShowcase } from "../../components/ProductShowcase";
import { EditorialAccordion } from "../../components/EditorialAccordion";
import { ProductLens } from "../../components/ProductLens";
import { SignatureScene } from "../../components/SignatureScene";
import { MotionPanel, MotionWords } from "../../components/Motion";
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  ShieldCheck,
  FileText,
  Building2,
  Plus,
  Minus,
  Menu,
} from "lucide-react";
const steps = [
  {
    title: "Connect your companies.",
    description:
      "Start with your organization. Bring every supplier relationship into one shared workspace.",
    label: "01 / RELATIONSHIP",
    icon: Building2,
  },
  {
    title: "Give information a structure.",
    description:
      "Company details, certificates and declarations belong to a reusable supplier identity. Every requirement has a clear place.",
    label: "02 / INFORMATION",
    icon: FileText,
  },
  {
    title: "See what needs attention.",
    description:
      "Understand what is complete, what is missing and which documents are approaching expiry. Take the next step with context.",
    label: "03 / CLARITY",
    icon: ShieldCheck,
  },
];
const faq = [
  [
    "What is Relay?",
    "Relay is a supplier information workspace for businesses. It brings company profiles, compliance documents and requirements into one structured view.",
  ],
  [
    "Who is it for?",
    "Teams working with supplier information: operations, quality, sustainability and compliance. Suppliers benefit from a clear place to organize the information their customers need.",
  ],
  [
    "Is Relay a marketplace?",
    "No. Relay focuses on the information and relationships behind an existing supplier network. It does not handle procurement or marketplace transactions.",
  ],
  [
    "What can I try today?",
    "The local preview includes an example network, supplier profiles, requirements and activity. You can create a local workspace, add suppliers and save documents on this device. Account sign-in opens a separate connected workspace. The connected workspace supports team invitations, secure supplier upload links and document sharing. Email delivery is being prepared.",
  ],
  [
    "Where is my information stored?",
    "In this local preview, workspace records stay in your browser and uploaded files stay in local browser storage. They do not sync across devices. The connected workspace uses private cloud storage and company permissions. Email delivery and production retention policies are still being prepared.",
  ],
  [
    "Who is behind Relay?",
    "Relay is a product of VOVERE. It has its own product identity, codebase and roadmap.",
  ],
];
export function PublicHeader() {
  const [menu, setMenu] = useState(false);
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!menu) return;
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(false);
        header.current
          ?.querySelector<HTMLButtonElement>(".public-menu")
          ?.focus();
      }
    };
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !header.current?.contains(event.target)
      )
        setMenu(false);
    };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", outside);
    };
  }, [menu]);
  return (
    <header ref={header} className="public-header">
      <Link className="wordmark" to="/" aria-label="Relay home">
        relay<span aria-hidden="true">↗</span>
      </Link>
      <nav
        className={menu ? "public-nav open" : "public-nav"}
        aria-label="Website navigation"
      >
        <a href="/#product" onClick={() => setMenu(false)}>
          The product
        </a>
        <a href="/#how-it-works" onClick={() => setMenu(false)}>
          How it works
        </a>
        <a href="/#questions" onClick={() => setMenu(false)}>
          Questions
        </a>
        <Link to="/login">Sign in</Link>
      </nav>
      <Link className="public-start" to="/signup">
        Get started <ArrowUpRight size={16} />
      </Link>
      <button
        className="public-menu"
        aria-label="Toggle website navigation"
        aria-expanded={menu}
        onClick={() => setMenu(!menu)}
      >
        <Menu size={22} />
      </button>
    </header>
  );
}
export function PublicFooter() {
  return (
    <footer className="public-footer">
      <Link className="wordmark" to="/">
        relay<span aria-hidden="true">↗</span>
      </Link>
      <a
        className="studio-attribution"
        href="https://vovere-studios.com"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="A product of VOVERE Studios — visit the studio"
      >
        <span>A product of</span>
        <img
          className="studio-logo studio-logo-light"
          src="/brand/wordmark-black.svg"
          alt="VOVERE"
          width="1717"
          height="238"
        />
        <img
          className="studio-logo studio-logo-dark"
          src="/brand/wordmark-white.svg"
          alt=""
          aria-hidden="true"
          width="1717"
          height="238"
        />
      </a>
      <div>
        <Link to="/app">Explore the demo</Link>
        <Link to="/login">Sign in</Link>
        <a href="/#questions">Questions</a>
      </div>
      <span>SUPPLIER INFORMATION, CONNECTED.</span>
    </footer>
  );
}
export function Website() {
  const [step, setStep] = useState(0);
  const current = steps[step];
  const Icon = current.icon;
  return (
    <div className="public-site">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <PublicHeader />
      <main id="main" className="public-main" tabIndex={-1}>
        <section className="public-hero">
          <p className="eyebrow">
            SUPPLIER INFORMATION. A CLEARER PERSPECTIVE.
          </p>
          <h1>
            <MotionWords>Less chasing.</MotionWords>
            <br />
            <span>
              <MotionWords>More knowing.</MotionWords>
            </span>
          </h1>
          <p className="public-lead">
            Your suppliers. Their documents. Your next step. <br />
            Company information, compliance documents and requirements.
            Connected.
          </p>
          <div className="public-actions">
            <Link className="public-cta" to="/signup">
              Create your workspace{" "}
              <span>
                <ArrowUpRight size={23} />
              </span>
            </Link>
            <Link className="public-demo" to="/app">
              Explore the product <ArrowRight size={17} />
            </Link>
          </div>
          <ProductLens />
          <div className="public-hero-bottom">
            <span>
              BUILT FOR CONNECTION.
              <br />
              DESIGNED FOR CLARITY.
            </span>
            <a href="#perspective" className="hero-scroll-link">
              SCROLL FOR A CLEARER PICTURE <span>↓</span>
            </a>
          </div>
        </section>
        <div id="perspective">
          <SignatureScene />
        </div>
        <section id="product" className="public-product">
          <div className="public-section-top">
            <span className="eyebrow">The product</span>
            <p>
              The information you need.
              <br />
              The perspective you've been missing.
            </p>
          </div>
          <ProductShowcase />
          <div className="public-principles">
            {[
              [
                "01",
                "One reusable identity.",
                "Company information belongs to the supplier. Relationships add the context your business needs.",
              ],
              [
                "02",
                "Evidence, organized.",
                "Certificates, declarations and supporting documents, connected to the company behind them.",
              ],
              [
                "03",
                "A clear next step.",
                "Missing requirements and approaching expiry dates become something you can act on.",
              ],
            ].map(([number, title, text]) => (
              <article key={number}>

                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="how-it-works" className="public-workflow">
          <div className="public-section-top">
            <span className="eyebrow">From connection to clarity</span>
          </div>
          <div className="workflow-layout">
            <div>
              <h2>
                Good information.
                <br />
                <span>Better together.</span>
              </h2>
              <div className="workflow-steps">
                {steps.map((item, index) => (
                  <button
                    key={item.title}
                    aria-pressed={step === index}
                    onClick={() => setStep(index)}
                  >
                    <span>0{index + 1}</span>
                    <div>
                      <strong>{item.title}</strong>
                      <div className="step-answer" data-open={step === index}>
                        <div>
                          <p>{item.description}</p>
                        </div>
                      </div>
                    </div>
                    {step === index ? <Minus size={18} /> : <Plus size={18} />}
                  </button>
                ))}
              </div>
            </div>
            <div className="workflow-preview" aria-live="polite">
              <MotionPanel identity={step}>
                <span className="eyebrow">{current.label}</span>
                <div className="workflow-card-cap">
                  <span className="workflow-company-mark">A</span>
                  <div>
                    <strong>Alpina Components</strong>
                    <small>Austria · Example supplier</small>
                  </div>
                  <Icon size={22} strokeWidth={1.4} />
                </div>
                <h3>{current.title}</h3>
                <div className="workflow-example">
                  {step === 0 ? (
                    <>
                      <Building2 size={22} />
                      <strong>Your organization</strong>
                      <ArrowRight size={18} />
                      <span>Supplier</span>
                    </>
                  ) : step === 1 ? (
                    <>
                      <FileText size={22} />
                      <strong>ISO 9001</strong>
                      <span>Certificate</span>
                    </>
                  ) : (
                    <>
                      <Check size={22} />
                      <strong>Information complete</strong>
                      <span>Ready</span>
                    </>
                  )}
                </div>
                <p>{current.description}</p>
                <div className="workflow-evidence-row">
                  <span>
                    {step === 0
                      ? "Company identity"
                      : step === 1
                        ? "Source document"
                        : "Requirement status"}
                  </span>
                  <span>
                    {step === 0
                      ? "Connected"
                      : step === 1
                        ? "PDF · Example"
                        : "Complete"}
                  </span>
                </div>
                <span className="workflow-note">
                  One relationship. A shared foundation.
                </span>
              </MotionPanel>
            </div>
          </div>
        </section>
        <section className="public-statement">
          <span className="eyebrow">BUILT AROUND WHAT MATTERS.</span>
          <h2>
            Trust starts
            <br />
            with knowing.
          </h2>
          <p>
            The durable value is the information. The relationships.
            <br />
            The confidence to move forward.
          </p>
          <Link className="public-demo" to="/app">
            See it for yourself <ArrowUpRight size={18} />
          </Link>
        </section>
        <section id="questions" className="public-questions">
          <div>
            <span className="eyebrow">A little more context</span>
            <h2>
              Good questions.
              <br />
              Clear answers.
            </h2>
          </div>
          <EditorialAccordion items={faq} />
        </section>
        <section className="public-final">
          <p className="eyebrow">YOUR NEXT CONNECTION.</p>
          <h2>
            Less uncertainty.
            <br />
            More perspective.
          </h2>
          <Link className="public-cta" to="/signup">
            Get started with Relay{" "}
            <span>
              <ArrowUpRight size={23} />
            </span>
          </Link>
          <p className="public-local-note">
            Explore the local preview. No account or payment required.
          </p>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
