import { AddSupplier } from "../components/WorkspaceActions";
import { useWorkspace } from "../data/Workspace";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpRight, Search, ArrowDown, X } from "lucide-react";
import { formatDate } from "../data/selectors";
import {
  Badge,
  Button,
  Dialog,
  EmptyState,
  Input,
  PageHeader,
  Progress,
  Status,
} from "../components/ui";
export function Suppliers() {
  const { supplierRows } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"name" | "updated">("name");
  const [info, setInfo] = useState(false);
  const status = params.get("status") || "all";
  const rows = supplierRows
    .filter(
      ({ supplier, relationship }) =>
        (status === "all" || relationship.status === status) &&
        `${supplier.legalName} ${supplier.country} ${supplier.category}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.supplier.legalName.localeCompare(b.supplier.legalName)
        : b.supplier.updatedAt.localeCompare(a.supplier.updatedAt),
    );
  return (
    <>
      <PageHeader
        eyebrow="YOUR CONNECTED COMPANIES"
        title="Suppliers."
        description="A shared foundation. Every relationship in one place."
        action={
          <div className="page-actions">
            <AddSupplier />
            <Button variant="secondary" onClick={() => setInfo(true)}>
              How connections work <ArrowUpRight size={16} />
            </Button>
          </div>
        }
      />
      <div className="supplier-toolbar">
        <div className="filter-tabs" aria-label="Filter suppliers">
          {[
            ["all", "All suppliers"],
            ["complete", "Complete"],
            ["missing", "Missing information"],
            ["attention", "Attention"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={status === value}
              className={status === value ? "selected" : ""}
              onClick={() =>
                setParams(value === "all" ? {} : { status: value })
              }
            >
              {label}
              <span>
                {value === "all"
                  ? supplierRows.length
                  : supplierRows.filter((r) => r.relationship.status === value)
                      .length}
              </span>
            </button>
          ))}
        </div>
        <div className="search-field">
          <Search size={16} />
          <Input
            aria-label="Search suppliers"
            placeholder="Search suppliers…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              className="icon-button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>
      <div className="directory-caption">
        <span>{rows.length} connections in view</span>
        <label>
          Sort by{" "}
          <select
            aria-label="Sort suppliers"
            value={sort}
            onChange={(e) => setSort(e.target.value as "name" | "updated")}
          >
            <option value="name">Company name</option>
            <option value="updated">Recently updated</option>
          </select>
        </label>
      </div>
      <div className="supplier-table">
        <div className="table-heading">
          <button onClick={() => setSort(sort === "name" ? "updated" : "name")}>
            Supplier <ArrowDown size={12} />
          </button>
          <span>Country</span>
          <span>Status</span>
          <span>Data completeness</span>
          <span>Last updated</span>
          <span />
        </div>
        {rows.map(({ supplier, relationship }) => (
          <Link
            className="supplier-row"
            key={supplier.id}
            to={`/app/suppliers/${supplier.id}`}
          >
            <div className="supplier-identity">
              <span className="company-monogram">
                {supplier.legalName.slice(0, 1)}
              </span>
              <div>
                <strong>{supplier.legalName}</strong>
                <small>{supplier.category}</small>
              </div>
            </div>
            <span className="supplier-country">{supplier.country}</span>
            <Status status={relationship.status} />
            <div className="completeness">
              <Progress value={relationship.completeness} />
              <span>{relationship.completeness}%</span>
            </div>
            <time dateTime={supplier.updatedAt}>
              {formatDate(supplier.updatedAt)}
            </time>
            <ArrowUpRight className="row-arrow" size={16} />
          </Link>
        ))}
      </div>
      {rows.length === 0 && (
        <EmptyState
          title="No matching suppliers."
          description="Try another name, country or status."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQuery("");
                setParams({});
              }}
            >
              Clear filters
            </Button>
          }
        />
      )}
      <div className="table-footer">
        <span>
          {rows.length} of {supplierRows.length} suppliers
        </span>
        <Badge>DEMO DATA</Badge>
        <span>Shared identities. Stronger relationships.</span>
      </div>
      <Dialog
        open={info}
        onClose={() => setInfo(false)}
        title="The next connection."
      >
        <p>
          Supplier invitations will be the next step: create a request, send a
          secure link and let your supplier build a reusable profile.
        </p>
        <p>
          This first version establishes the workspace and data structure.
          Invitations and email delivery are not connected yet.
        </p>
      </Dialog>
    </>
  );
}
