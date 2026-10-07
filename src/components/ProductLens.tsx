import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  FileText,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { MotionPanel } from "./Motion";
const views = [
  {
    name: "Identity",
    label: "THE COMPANY BEHIND THE INFORMATION",
    title: "Alpina Components.",
    detail: "Austria · Precision components",
    rows: [
      ["Company registration", "Recorded"],
      ["Primary contact", "Connected"],
      ["Company profile", "Ready for review"],
    ],
  },
  {
    name: "Evidence",
    label: "INFORMATION WITH A SOURCE",
    title: "Evidence. In context.",
    detail: "Documents linked to the company they belong to.",
    rows: [
      ["ISO 9001", "Certificate"],
      ["REACH declaration", "Declaration"],
      ["Company register", "Company document"],
    ],
  },
  {
    name: "Perspective",
    label: "A CLEAR NEXT STEP",
    title: "Know what comes next.",
    detail: "Requirements turn information into a useful view.",
    rows: [
      ["Company information", "Complete"],
      ["Compliance evidence", "Review required"],
      ["Material specification", "Missing"],
    ],
  },
];
export function ProductLens() {
  const [view, setView] = useState(0);
  const current = views[view];
  const Icon = [Building2, FileText, ShieldCheck][view];
  return (
    <section className="product-lens" aria-label="Explore a supplier record">
      <div className="lens-caption">
        <span>ONE CONNECTION. THREE PERSPECTIVES.</span>
        <span>ILLUSTRATIVE PRODUCT VIEW</span>
      </div>
      <div className="lens-shell">
        <div className="lens-index">
          <span className="lens-mark">↗</span>
          <div>
            <span className="eyebrow">THE RELAY RECORD</span>
            <p>
              A company.
              <br />
              The whole picture.
            </p>
          </div>
          <div className="lens-tabs" aria-label="Record perspectives">
            {views.map((item, i) => (
              <button
                key={item.name}
                aria-pressed={view === i}
                onClick={() => setView(i)}
              >
                <span>0{i + 1}</span>
                {item.name}
                <ArrowUpRight size={14} />
              </button>
            ))}
          </div>
          <span className="lens-footnote">EXAMPLE / ALPINA COMPONENTS</span>
        </div>
        <div className="lens-content" aria-live="polite">
          <MotionPanel identity={view} compact>
            <div className="lens-record-top">
              <span className="eyebrow">{current.label}</span>
              <Icon size={22} strokeWidth={1.2} />
            </div>
            <h2>{current.title}</h2>
            <p>{current.detail}</p>
            <div className="lens-record-rows">
              {current.rows.map(([name, status]) => (
                <div key={name}>
                  <span>{name}</span>
                  <span>
                    {status}
                    {status === "Complete" && <Check size={12} />}
                  </span>
                </div>
              ))}
            </div>
            <Link to="/app/suppliers/supplier-1">
              Open the example record <ArrowUpRight size={16} />
            </Link>
          </MotionPanel>
        </div>
      </div>
    </section>
  );
}
