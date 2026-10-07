import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  Building2,
  FileText,
  LayoutGrid,
  Check,
  CircleAlert,
  Files,
} from "lucide-react";
import { documents } from "../data/mock";
import { supplierRows, networkStats, getSupplier } from "../data/selectors";
import { MotionPanel } from "./Motion";
import { Progress, Status } from "./ui";

const views = [
  { name: "Overview", icon: LayoutGrid },
  { name: "Suppliers", icon: Building2 },
  { name: "Documents", icon: Files },
];
export function ProductShowcase() {
  const [view, setView] = useState(0);
  const [selectedId, setSelectedId] = useState(supplierRows[0]?.supplier.id);
  const selected =
    supplierRows.find((row) => row.supplier.id === selectedId) ??
    supplierRows[0];
  const complete = networkStats.total
    ? Math.round((networkStats.complete / networkStats.total) * 100)
    : 0;
  const rows = supplierRows.slice(0, view === 1 ? 4 : 3);
  return (
    <div className="showcase-frame">
      <div className="showcase-caption">
        <span>The connected workspace</span>
        <span>Example data · Interactive preview</span>
      </div>
      <div className="showcase-shell">
        <aside className="showcase-nav" aria-label="Product preview views">
          <span className="showcase-logo">
            relay <span>↗</span>
          </span>
          <span className="showcase-company">
            Forma Industries<small>Example organization</small>
          </span>
          <div>
            {views.map(({ name, icon: Icon }, i) => (
              <button
                key={name}
                aria-pressed={view === i}
                onClick={() => setView(i)}
              >
                <Icon size={16} />
                <span>{name}</span>
                <ArrowRight size={13} />
              </button>
            ))}
          </div>
          <p>
            Less chasing.
            <br />
            More knowing.
          </p>
          <Link to="/app">
            Open workspace <ArrowUpRight size={14} />
          </Link>
        </aside>
        <div className="showcase-main">
          <div className="showcase-topbar">
            <span>
              Workspace <span>/</span> {views[view].name}
            </span>
            <span className="showcase-preview">
              <i /> Local preview
            </span>
          </div>
          <MotionPanel identity={view} compact>
            <header className="showcase-heading">
              <span className="eyebrow">
                {view === 0
                  ? "YOUR NETWORK, IN VIEW"
                  : view === 1
                    ? "THE COMPANIES BEHIND YOUR BUSINESS"
                    : "EVIDENCE, IN CONTEXT"}
              </span>
              <h2>
                {view === 0 ? (
                  <>
                    Every connection.
                    <br />
                    <span>A clearer picture.</span>
                  </>
                ) : view === 1 ? (
                  "Know your suppliers."
                ) : (
                  "Keep the evidence close."
                )}
              </h2>
            </header>
            {view === 0 && (
              <div className="showcase-metrics">
                {[
                  [networkStats.total, "Connections"],
                  [`${complete}%`, "Complete profiles"],
                  [networkStats.expiring, "Expiring documents"],
                ].map(([value, label]) => (
                  <div key={label}>
                    <strong>{value}</strong>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="showcase-split">
              <div className="showcase-records">
                <div className="showcase-list-heading">
                  <span>
                    {view === 2 ? "Company documents" : "Your connections"}
                  </span>
                  <Link to={view === 2 ? "/app/documents" : "/app/suppliers"}>
                    View all <ArrowUpRight size={13} />
                  </Link>
                </div>
                {view === 2
                  ? documents
                      .filter((doc) => doc.supplierId === selected?.supplier.id)
                      .slice(0, 4)
                      .map((doc) => (
                        <Link
                          className="showcase-document"
                          key={doc.id}
                          to={`/app/suppliers/${doc.supplierId}?tab=Documents`}
                        >
                          <span className="showcase-avatar">
                            <FileText size={17} />
                          </span>
                          <span>
                            <strong>{doc.name}</strong>
                            <small>
                              {getSupplier(doc.supplierId)?.supplier
                                .legalName ?? "Supplier document"}
                            </small>
                          </span>
                          <ArrowUpRight size={14} />
                        </Link>
                      ))
                  : rows.map(({ supplier, relationship }) => (
                      <button
                        className="showcase-record"
                        key={supplier.id}
                        aria-pressed={selected?.supplier.id === supplier.id}
                        onClick={() => setSelectedId(supplier.id)}
                      >
                        <span className="showcase-avatar">
                          {supplier.legalName[0]}
                        </span>
                        <span>
                          <strong>{supplier.legalName}</strong>
                          <small>{supplier.country}</small>
                        </span>
                        <Status status={relationship.status} />
                        <ArrowRight size={14} />
                      </button>
                    ))}
                {view === 2 &&
                  !documents.some(
                    (doc) => doc.supplierId === selected?.supplier.id,
                  ) && (
                    <p className="showcase-no-documents">
                      No documents recorded for this example company yet.
                    </p>
                  )}
              </div>
              {selected && (
                <aside
                  className="showcase-inspector"
                  aria-label="Selected preview connection"
                >
                  <MotionPanel identity={selected.supplier.id} compact>
                    <span className="eyebrow">
                      {view === 2
                        ? "CONNECTED TO A COMPANY"
                        : "SELECTED CONNECTION"}
                    </span>
                    <span className="showcase-inspector-mark">
                      {selected.supplier.countryCode}
                    </span>
                    <h3>{selected.supplier.legalName}</h3>
                    <p>{selected.supplier.category}</p>
                    <div className="showcase-completeness">
                      <span>
                        Information complete
                        <strong>{selected.relationship.completeness}%</strong>
                      </span>
                      <Progress value={selected.relationship.completeness} />
                    </div>
                    <div className="showcase-next">
                      {selected.relationship.status === "complete" ? (
                        <Check size={15} />
                      ) : (
                        <CircleAlert size={15} />
                      )}
                      <span>
                        {selected.relationship.status === "complete"
                          ? "The profile is ready to review."
                          : selected.relationship.status === "attention"
                            ? "A document needs your attention."
                            : "There is information to collect."}
                      </span>
                    </div>
                    <Link to={`/app/suppliers/${selected.supplier.id}`}>
                      Explore connection <ArrowUpRight size={15} />
                    </Link>
                  </MotionPanel>
                </aside>
              )}
            </div>
          </MotionPanel>
        </div>
      </div>
    </div>
  );
}
