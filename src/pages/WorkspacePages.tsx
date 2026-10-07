import {
  CreateRequest,
  UploadDocument,
  EditOrganization,
} from "../components/WorkspaceActions";
import { Link, useSearchParams } from "react-router-dom";
import { FileText, ArrowUpRight } from "lucide-react";
import { useWorkspace } from "../data/Workspace";
import { daysUntil, formatDate } from "../data/selectors";
import {
  Badge,
  EmptyState,
  PageHeader,
  SectionHeader,
  Status,
} from "../components/ui";
import { ActivityList } from "../components/ActivityList";
export function Documents() {
  const { documents, certificates, getSupplier } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const expiring = params.get("status") === "expiring";
  const visible = documents.filter(
    (d) =>
      !expiring ||
      certificates.some(
        (c) => c.documentId === d.id && daysUntil(c.validUntil) <= 30,
      ),
  );
  return (
    <>
      <PageHeader
        eyebrow="YOUR INFORMATION LIBRARY"
        title="Documents."
        description="The evidence behind every relationship."
        action={<UploadDocument />}
      />
      <div className="filter-tabs document-filters">
        <button
          className={!expiring ? "selected" : ""}
          onClick={() => setParams({})}
        >
          All documents <span>{documents.length}</span>
        </button>
        <button
          className={expiring ? "selected" : ""}
          onClick={() => setParams({ status: "expiring" })}
        >
          Expiring soon <span>2</span>
        </button>
      </div>
      {visible.map((d) => {
        const cert = certificates.find((c) => c.documentId === d.id);
        return (
          <Link
            className="document-row list-row"
            key={d.id}
            to={`/app/suppliers/${d.supplierId}?tab=Documents`}
          >
            <span className="activity-icon">
              <FileText size={19} />
            </span>
            <div className="row-copy">
              <strong>{d.name}</strong>
              <small>{getSupplier(d.supplierId)?.supplier.legalName}</small>
            </div>
            {cert ? (
              <Status
                status={
                  daysUntil(cert.validUntil) <= 30 ? "attention" : "complete"
                }
                label={
                  daysUntil(cert.validUntil) <= 30
                    ? `Expires in ${daysUntil(cert.validUntil)} days`
                    : "Active"
                }
              />
            ) : (
              <Badge>DECLARATION</Badge>
            )}
            <ArrowUpRight size={16} />
          </Link>
        );
      })}
      <p className="quiet-note">
        Example records contain metadata only. Uploaded files are saved in this
        browser and can be downloaded from the supplier profile.
      </p>
    </>
  );
}
export function Requests() {
  const { requests, supplierRows } = useWorkspace();
  return (
    <>
      <PageHeader
        eyebrow="INFORMATION IN MOTION"
        title="Requests."
        description="A clear path from missing to complete."
        action={<CreateRequest />}
      />
      {requests.map((r) => {
        const supplier = supplierRows.find(
          (row) => row.relationship.id === r.relationshipId,
        )!.supplier;
        return (
          <Link
            key={r.id}
            className="request-row"
            to={`/app/suppliers/${supplier.id}?tab=Requirements`}
          >
            <div>
              <Badge>
                {r.id.startsWith("request-")
                  ? "EXAMPLE REQUEST"
                  : "LOCAL REQUEST"}
              </Badge>
              <h2>{r.title}</h2>
              <p>{supplier.legalName}</p>
            </div>
            <div>
              <span>{r.requirementIds.length} requirements</span>
              <small>Due {formatDate(r.dueAt)}</small>
            </div>
            <ArrowUpRight size={20} />
          </Link>
        );
      })}
      <p className="quiet-note">
        Requests are prepared locally. Example responses are illustrative. No
        invitation or email has been sent.
      </p>
    </>
  );
}
export function Products() {
  const { products, getSupplier } = useWorkspace();
  return (
    <>
      <PageHeader
        eyebrow="WHAT YOUR NETWORK MAKES"
        title="Products."
        description="Structured information, from company to component."
      />
      {products.map((p) => (
        <Link
          className="list-row document-row"
          key={p.id}
          to={`/app/suppliers/${p.supplierId}?tab=Products`}
        >
          <span className="company-monogram">P</span>
          <div className="row-copy">
            <strong>{p.name}</strong>
            <small>
              {getSupplier(p.supplierId)?.supplier.legalName} · {p.reference}
            </small>
          </div>
          <span className="product-material">{p.material}</span>
          <ArrowUpRight size={17} />
        </Link>
      ))}
      <p className="quiet-note">
        Product records establish the domain foundation. Materials and
        specifications can be extended later.
      </p>
    </>
  );
}
export function Organization() {
  const { organization } = useWorkspace();
  return (
    <>
      <PageHeader
        eyebrow="YOUR COMPANY IDENTITY"
        title="Organization."
        description="The starting point for your supplier network."
        action={<EditOrganization />}
      />
      <SectionHeader title={organization.legalName} />
      <dl className="information-grid">
        <div>
          <dt>Organization</dt>
          <dd>{organization.legalName}</dd>
        </div>
        <div>
          <dt>Country</dt>
          <dd>{organization.countryCode}</dd>
        </div>
        <div>
          <dt>Registration number</dt>
          <dd>{organization.registrationNumber}</dd>
        </div>
        <div>
          <dt>Workspace role</dt>
          <dd>Buyer organization</dd>
        </div>
        <div>
          <dt>Plan</dt>
          <dd>Local demo</dd>
        </div>
        <div>
          <dt>Workspace access</dt>
          <dd>Authentication not connected</dd>
        </div>
      </dl>
      <p className="quiet-note">
        Company details are saved locally. Shared access and team permissions
        follow the connected release.
      </p>
    </>
  );
}
export function ActivityPage() {
  const { activities } = useWorkspace();
  return (
    <>
      <PageHeader
        eyebrow="A SHARED RECORD OF PROGRESS"
        title="Activity."
        description="Every update, connected to its supplier."
      />
      <ActivityList items={activities} />
    </>
  );
}
export function NotFound() {
  return (
    <EmptyState
      title="This page isn't here."
      description="Return to your workspace to find your supplier network."
      action={
        <Link to="/app" className="button button-primary">
          Back to overview
        </Link>
      }
    />
  );
}
