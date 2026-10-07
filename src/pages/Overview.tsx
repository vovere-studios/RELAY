import { MotionWords } from "../components/Motion";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  CircleAlert,
  FileClock,
} from "lucide-react";
import { useWorkspace } from "../data/Workspace";
import { daysUntil } from "../data/selectors";
import { Badge, Progress, SectionHeader, Status } from "../components/ui";
import { ActivityList } from "../components/ActivityList";

function NetworkPortrait() {
  const { supplierRows, networkStats } = useWorkspace();
  const [selected, setSelected] = useState(0);
  const { supplier, relationship } = supplierRows[selected];
  return (
    <section
      className="network-portrait"
      aria-label="Interactive supplier network"
    >
      <div className="portrait-top">
        <span className="eyebrow">NETWORK HEALTH</span>
        <span className="portrait-live">
          <span />
          {networkStats.total} connections
        </span>
      </div>
      <div className="portrait-score">
        <strong>
          {Math.round((networkStats.complete / networkStats.total) * 100)}
          <span>%</span>
        </strong>
        <p>
          A stronger network.
          <br />
          One connection at a time.
        </p>
      </div>
      <div className="network-matrix" aria-label="Explore the supplier network">
        {supplierRows.map((row, index) => (
          <button
            key={row.supplier.id}
            onClick={() => setSelected(index)}
            aria-label={`${row.supplier.legalName}, ${row.relationship.status}`}
            aria-pressed={selected === index}
            className={`network-node node-${row.relationship.status} ${selected === index ? "node-selected" : ""}`}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            {row.relationship.status === "complete" ? (
              <Check size={14} />
            ) : row.relationship.status === "attention" ? (
              <FileClock size={14} />
            ) : (
              <span className="node-dash">—</span>
            )}
          </button>
        ))}
      </div>
      <div key={selected} className="portrait-selection" aria-live="polite" aria-atomic="true">
        <div>
          <span className="eyebrow">
            {supplier.countryCode} / SELECTED CONNECTION
          </span>
          <Link to={`/app/suppliers/${supplier.id}`}>
            {supplier.legalName}
            <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="portrait-selection-bottom">
          <Status status={relationship.status} />
          <span>{relationship.completeness}% complete</span>
        </div>
      </div>
      <div className="portrait-legend">
        <span>
          <i className="legend-complete" />
          Complete
        </span>
        <span>
          <i className="legend-missing" />
          Missing
        </span>
        <span>
          <i className="legend-attention" />
          Expiring
        </span>
      </div>
    </section>
  );
}
export function Overview() {
  const {
    currentUser,
    supplierRows,
    networkStats,
    expiringCertificates,
    getSupplier,
    activities,
  } = useWorkspace();
  const missing = supplierRows.find(
    (r) => r.relationship.missingRequirements === 2,
  )!;
  const expiring = expiringCertificates[0];
  const stats = [
    {
      value: networkStats.total,
      label: "Connected suppliers",
      detail: `${new Set(supplierRows.map((r) => r.supplier.countryCode)).size} countries. One shared view.`,
      to: "/app/suppliers",
    },
    {
      value: networkStats.complete,
      label: "Complete profiles",
      detail: "The information you need, ready.",
      to: "/app/suppliers?status=complete",
    },
    {
      value: networkStats.missing,
      label: "Information missing",
      detail: "A clear next step for every gap.",
      to: "/app/suppliers?status=missing",
    },
    {
      value: networkStats.expiring,
      label: "Expiring documents",
      detail: "Stay ahead of the next deadline.",
      to: "/app/documents?status=expiring",
    },
  ];
  return (
    <div className="overview-page">
      <div className="overview-masthead">
        <span className="eyebrow">
          <span className="index-dot" />
          THE CONNECTED WORKSPACE
        </span>
        <span className="overview-date">
          07 OCT 2026 <span> / </span> WEDNESDAY
        </span>
      </div>
      <div className="overview-hero">
        <header className="hero-copy">
          <div>
            <Badge>SUPPLIER INTELLIGENCE / 01</Badge>
            <h1>
              <MotionWords>Your network.</MotionWords>
              <br />
              <span><MotionWords>In focus.</MotionWords></span>
            </h1>
            <p>
              Good morning, {currentUser.name.split(" ")[0]}.
              <br />A little more clarity. A lot more connected.
            </p>
          </div>
          <Link className="hero-cta" to="/app/suppliers">
            <span>Explore your network</span>
            <span className="cta-arrow">
              <ArrowUpRight size={23} strokeWidth={1.5} />
            </span>
          </Link>
          <div className="hero-context">
            <span className="context-line" />
            <span>
              Company data. Documents. Relationships.
              <br />
              One place to see the whole picture.
            </span>
          </div>
        </header>
        <NetworkPortrait />
      </div>
      <section className="metric-strip" aria-label="Supplier network status">
        {stats.map((stat, index) => (
          <Link key={stat.label} to={stat.to} className="metric-item">
            <div className="metric-top">
              <span className="eyebrow">0{index + 1}</span>
              <ArrowUpRight size={17} />
            </div>
            <div className="metric-value">
              {String(stat.value).padStart(2, "0")}
              <span>{stat.label}</span>
            </div>
            <p>{stat.detail}</p>
          </Link>
        ))}
      </section>
      <div className="overview-columns">
        <section className="attention-section">
          <SectionHeader
            number="01"
            title="A few things to move forward."
            to="/app/suppliers?status=attention"
            linkLabel="Review network"
          />
          <div className="attention-list">
            <Link
              className="attention-item"
              to={`/app/suppliers/${missing.supplier.id}`}
            >
              <div className="attention-item-top">
                <span className="attention-icon">
                  <CircleAlert size={18} />
                </span>
                <Badge>INFORMATION MISSING</Badge>
                <ArrowUpRight size={20} />
              </div>
              <h3>{missing.supplier.legalName}</h3>
              <p>
                {missing.relationship.missingRequirements} requirements awaiting
                a response.
              </p>
              <div className="attention-bottom">
                <span>Company & compliance</span>
                <span>
                  Review connection <ArrowRight size={14} />
                </span>
              </div>
            </Link>
            <Link
              className="attention-item"
              to={`/app/suppliers/${expiring.supplierId}`}
            >
              <div className="attention-item-top">
                <span className="attention-icon">
                  <FileClock size={18} />
                </span>
                <Badge>EXPIRING IN {daysUntil(expiring.validUntil)} DAYS</Badge>
                <ArrowUpRight size={20} />
              </div>
              <h3>{getSupplier(expiring.supplierId)?.supplier.legalName}</h3>
              <p>{expiring.standard} · Environmental management</p>
              <div className="attention-bottom">
                <span>30 October 2026</span>
                <span>
                  Review certificate <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          </div>
        </section>
        <section className="recent-section">
          <SectionHeader
            number="02"
            title="Moving, together."
            to="/app/activity"
            linkLabel="All activity"
          />
          <ActivityList items={activities} />
        </section>
      </div>
      <section className="network-preview">
        <SectionHeader
          number="03"
          title="The people behind the progress."
          to="/app/suppliers"
          linkLabel="All suppliers"
        />
        <div className="preview-grid">
          {supplierRows.slice(0, 4).map(({ supplier, relationship }) => (
            <Link
              className="preview-supplier"
              key={supplier.id}
              to={`/app/suppliers/${supplier.id}`}
            >
              <div className="preview-top">
                <span className="country-code">{supplier.countryCode}</span>
                <ArrowUpRight size={18} />
              </div>
              <strong>{supplier.legalName}</strong>
              <span>{supplier.category}</span>
              <div className="preview-progress">
                <Progress value={relationship.completeness} />
                <span>{relationship.completeness}%</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <div className="overview-signoff">
        <span>
          Less chasing.
          <br />
          More knowing.
        </span>
        <p>Supplier information, connected.</p>
        <span className="signoff-arrow" aria-hidden="true">
          ↗
        </span>
      </div>
    </div>
  );
}
