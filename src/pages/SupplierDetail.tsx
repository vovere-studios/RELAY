import { AnimatedTabs } from "../components/AnimatedTabs";
import { MotionPanel } from "../components/Motion";
import {
  EditSupplier,
  UploadDocument,
  DownloadDocument,
} from "../components/WorkspaceActions";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { useWorkspace } from "../data/Workspace";
import { daysUntil, formatDate } from "../data/selectors";
import {
  Badge,
  EmptyState,
  ListRow,
  PageHeader,
  Progress,
  SectionHeader,
  Status,
} from "../components/ui";
import { ActivityList } from "../components/ActivityList";
const tabs = [
  "Overview",
  "Company",
  "Products",
  "Documents",
  "Certificates",
  "Requirements",
  "Activity",
];
export function SupplierDetail() {
  const {
    getSupplier,
    activities,
    certificates,
    documents,
    products,
    requirements,
  } = useWorkspace();
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const row = getSupplier(id || "");
  const requestedTab = params.get("tab") || "Overview";
  const tab = tabs.includes(requestedTab) ? requestedTab : "Overview";
  if (!row)
    return (
      <EmptyState
        title="Supplier not found."
        description="This supplier is not part of the demo network."
        action={
          <Link to="/app/suppliers" className="button button-secondary">
            Back to suppliers
          </Link>
        }
      />
    );
  const { supplier, relationship } = row;
  const supplierDocs = documents.filter((d) => d.supplierId === supplier.id);
  const supplierCerts = certificates.filter(
    (c) => c.supplierId === supplier.id,
  );
  const supplierReqs = requirements.filter(
    (r) => r.relationshipId === relationship.id,
  );
  const supplierProducts = products.filter((p) => p.supplierId === supplier.id);
  const supplierActivity = activities.filter(
    (a) => a.supplierId === supplier.id,
  );
  const company = (
    <section>
      <SectionHeader title="Company information" />
      <dl className="information-grid">
        <div>
          <dt>Legal name</dt>
          <dd>{supplier.legalName}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>
            {supplier.city}, {supplier.country}
          </dd>
        </div>
        <div>
          <dt>Registration number</dt>
          <dd>{supplier.registrationNumber}</dd>
        </div>
        <div>
          <dt>Industry</dt>
          <dd>{supplier.category}</dd>
        </div>
        <div>
          <dt>Primary contact</dt>
          <dd>{supplier.contactName}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{supplier.contactEmail}</dd>
        </div>
      </dl>
      <p className="quiet-note">
        Company information is stored locally. Example verification is
        simulated; edited information requires review.
      </p>
    </section>
  );
  const certSection = (
    <section>
      <SectionHeader title="Certificates" />
      {supplierCerts.length ? (
        supplierCerts.map((c) => (
          <ListRow key={c.id}>
            <span className="activity-icon">
              <ShieldCheck size={19} />
            </span>
            <div className="row-copy">
              <strong>{c.standard}</strong>
              <small>
                {c.issuer} · Valid until {formatDate(c.validUntil)}
              </small>
            </div>
            <Status
              status={daysUntil(c.validUntil) <= 30 ? "attention" : "complete"}
              label={
                daysUntil(c.validUntil) <= 30
                  ? `Expires in ${daysUntil(c.validUntil)} days`
                  : "Active"
              }
            />
          </ListRow>
        ))
      ) : (
        <EmptyState
          title="No certificates recorded."
          description="Certificates will appear here when supplier documents are connected."
        />
      )}
    </section>
  );
  return (
    <>
      <Link className="back-link" to="/app/suppliers">
        <ArrowLeft size={14} />
        All suppliers
      </Link>
      <PageHeader
        eyebrow="SUPPLIER IDENTITY"
        title={supplier.legalName}
        description={`${supplier.city}, ${supplier.country} · ${supplier.category}`}
        action={
          <div className="supplier-profile-mark">
            <span aria-hidden="true">{supplier.legalName.slice(0, 1)}</span>
            <Status status={relationship.status} />
            <EditSupplier supplierId={supplier.id} />
          </div>
        }
      />
      <div className="supplier-summary">
        <span className="verified-label">
          <ShieldCheck size={16} />
          {supplier.verifiedAt
            ? "Verified company information"
            : "Company information awaiting review"}
          <Badge>
            {supplier.id.startsWith("supplier-") ? "EXAMPLE" : "LOCAL"}
          </Badge>
        </span>
        <div className="detail-completeness">
          <span>Data completeness</span>
          <Progress value={relationship.completeness} />
          <strong>{relationship.completeness}%</strong>
        </div>
      </div>
      <AnimatedTabs
        items={tabs}
        selected={tab}
        onSelect={(t) => setParams(t === "Overview" ? {} : { tab: t })}
        label="Supplier sections"
      />
      <div className="supplier-tab-surface">
        <MotionPanel identity={tab} compact>
          {(tab === "Overview" || tab === "Company") && (
            <div className={tab === "Overview" ? "detail-columns" : ""}>
              {company}
              {tab === "Overview" && certSection}
            </div>
          )}
          {tab === "Overview" && (
            <section className="detail-requirements">
              <SectionHeader
                title="Requirements"
                to={`?tab=Requirements`}
                linkLabel="All requirements"
              />
              {supplierReqs.length ? (
                <div className="requirement-summary">
                  <span>
                    <Check size={17} />{" "}
                    {
                      supplierReqs.filter((r) => r.status === "satisfied")
                        .length
                    }{" "}
                    of {supplierReqs.length} requirements complete
                  </span>
                  <p>
                    {relationship.missingRequirements
                      ? "Company and compliance information is still needed."
                      : "Your required information is up to date."}
                  </p>
                </div>
              ) : (
                <p className="quiet-note">
                  Requirements have not been configured for this demo
                  relationship.
                </p>
              )}
            </section>
          )}
          {tab === "Certificates" && certSection}
          {tab === "Documents" && (
            <section>
              <div className="document-section-heading">
                <SectionHeader title="Documents" />
                <UploadDocument supplierId={supplier.id} />
              </div>
              {supplierDocs.length ? (
                supplierDocs.map((d) => (
                  <ListRow key={d.id}>
                    <span className="activity-icon">
                      <FileText size={19} />
                    </span>
                    <div className="row-copy">
                      <strong>{d.name}</strong>
                      <small>
                        {d.mimeType === "application/pdf" ? "PDF" : "Image"} ·
                        Received {formatDate(d.uploadedAt)}
                      </small>
                    </div>
                    {d.storagePath?.startsWith("local:") ? (
                      <DownloadDocument document={d} />
                    ) : (
                      <Badge>DEMO RECORD</Badge>
                    )}
                  </ListRow>
                ))
              ) : (
                <EmptyState
                  title="No documents recorded."
                  description="A structured place for supplier certificates and declarations."
                />
              )}
              <p className="quiet-note">
                Uploaded files are saved on this device. Example records contain
                metadata only.
              </p>
            </section>
          )}
          {tab === "Products" && (
            <section>
              <SectionHeader title="Products" />
              {supplierProducts.length ? (
                supplierProducts.map((p) => (
                  <ListRow key={p.id}>
                    <span className="company-monogram">P</span>
                    <div className="row-copy">
                      <strong>{p.name}</strong>
                      <small>
                        {p.reference} · {p.material}
                      </small>
                    </div>
                    <Badge>PRODUCT</Badge>
                  </ListRow>
                ))
              ) : (
                <EmptyState
                  title="Product information comes next."
                  description="This supplier has no products recorded in the demo."
                />
              )}
            </section>
          )}
          {tab === "Requirements" && (
            <section>
              <SectionHeader title="Required information" />
              {supplierReqs.length ? (
                supplierReqs.map((r) => (
                  <ListRow key={r.id}>
                    <div className="row-copy">
                      <strong>{r.name}</strong>
                      <small>
                        {r.kind === "document"
                          ? "Compliance document"
                          : "Company information"}
                      </small>
                    </div>
                    <Status
                      status={r.status === "satisfied" ? "complete" : "missing"}
                      label={r.status === "satisfied" ? "Satisfied" : "Missing"}
                    />
                  </ListRow>
                ))
              ) : (
                <EmptyState
                  title="No requirements configured."
                  description="Buyer-specific requirements will define what this relationship needs."
                />
              )}
            </section>
          )}
          {tab === "Activity" && (
            <section>
              <SectionHeader title="Relationship activity" />
              {supplierActivity.length ? (
                <ActivityList items={supplierActivity} />
              ) : (
                <EmptyState
                  title="A quiet start."
                  description="Updates for this supplier will appear here."
                />
              )}
            </section>
          )}
        </MotionPanel>
      </div>
      <div className="detail-bottom">
        <span>Last updated {formatDate(supplier.updatedAt)}</span>
        <Link to="/app/documents">
          Explore documents <ArrowUpRight size={14} />
        </Link>
      </div>
    </>
  );
}
