import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as mock from "./mock";
import { daysUntil } from "./selectors";
import type {
  Supplier,
  SupplierRelationship,
  Document,
  Activity,
} from "../domain/types";
const initial = {
  organization: mock.organization,
  currentUser: mock.currentUser,
  suppliers: mock.suppliers,
  relationships: mock.relationships,
  documents: mock.documents,
  certificates: mock.certificates,
  requirements: mock.requirements,
  requests: mock.requests,
  activities: mock.activities,
  products: mock.products,
};
type WorkspaceData = typeof initial;
const key = "relay-local-workspace-v1";
function readData(): WorkspaceData {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    if (
      saved?.version === 1 &&
      saved.data?.organization?.id &&
      Object.keys(initial)
        .filter((k) => Array.isArray(initial[k as keyof WorkspaceData]))
        .every(
          (k) =>
            Array.isArray(saved.data[k]) &&
            saved.data[k].every(
              (item: unknown) =>
                typeof item === "object" &&
                item !== null &&
                typeof (item as { id?: unknown }).id === "string",
            ),
        )
    )
      return saved.data;
  } catch {}
  return initial;
}
function useWorkspaceState() {
  const [data, setData] = useState<WorkspaceData>(readData);
  const [storageError, setStorageError] = useState(false);
  function update(next: WorkspaceData) {
    setData(next);
    try {
      localStorage.setItem(key, JSON.stringify({ version: 1, data: next }));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }
  const supplierRows = useMemo(
    () =>
      data.suppliers.flatMap((supplier) => {
        const relationship = data.relationships.find(
          (r) => r.supplierId === supplier.id,
        );
        return relationship ? [{ supplier, relationship }] : [];
      }),
    [data],
  );
  const expiringCertificates = data.certificates.filter(
    (c) => daysUntil(c.validUntil) >= 0 && daysUntil(c.validUntil) <= 30,
  );
  function addSupplier(values: {
    name: string;
    country: string;
    countryCode: string;
    contactEmail: string;
    category: string;
  }) {
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const supplier: Supplier = {
      id,
      organizationId: crypto.randomUUID(),
      legalName: values.name.trim(),
      country: values.country,
      countryCode: values.countryCode,
      city: "Not provided",
      category: values.category,
      registrationNumber: "Not provided",
      website: "Not provided",
      contactName: "Not provided",
      contactEmail: values.contactEmail,
      verifiedAt: null,
      updatedAt: timestamp,
    };
    const relationship: SupplierRelationship = {
      id: crypto.randomUUID(),
      buyerOrganizationId: data.organization.id,
      supplierId: id,
      status: "missing",
      completeness: 0,
      missingRequirements: 3,
      createdAt: timestamp,
    };
    const activity: Activity = {
      id: crypto.randomUUID(),
      supplierId: id,
      actorId: data.currentUser.id,
      title: "Supplier added locally",
      description: "A new relationship was created in the local workspace.",
      occurredAt: timestamp,
      kind: "supplier",
    };
    update({
      ...data,
      suppliers: [...data.suppliers, supplier],
      relationships: [...data.relationships, relationship],
      requirements: [
        ...data.requirements,
        ...[
          "Company registration",
          "ISO 9001 certificate",
          "REACH declaration",
        ].map((name, index) => ({
          id: crypto.randomUUID(),
          relationshipId: relationship.id,
          name,
          kind: index === 0 ? ("company" as const) : ("document" as const),
          status: "missing" as const,
          documentId: null,
        })),
      ],
      activities: [activity, ...data.activities],
    });
    return id;
  }
  function addDocument(document: Document) {
    update({
      ...data,
      documents: [document, ...data.documents],
      activities: [
        {
          id: crypto.randomUUID(),
          supplierId: document.supplierId,
          actorId: data.currentUser.id,
          title: "Document saved locally",
          description: document.name,
          occurredAt: document.uploadedAt,
          kind: "document",
        },
        ...data.activities,
      ],
    });
  }
  function saveOrganization(values: {
    name: string;
    countryCode: string;
    registrationNumber: string;
    website: string;
  }) {
    update({
      ...data,
      organization: {
        ...data.organization,
        legalName: values.name,
        countryCode: values.countryCode,
        registrationNumber: values.registrationNumber,
        website: values.website,
      },
    });
  }
  function editSupplier(
    id: string,
    values: Pick<
      Supplier,
      | "legalName"
      | "city"
      | "registrationNumber"
      | "website"
      | "contactName"
      | "contactEmail"
      | "category"
    >,
  ) {
    update({
      ...data,
      suppliers: data.suppliers.map((s) =>
        s.id === id
          ? {
              ...s,
              ...values,
              verifiedAt: null,
              updatedAt: new Date().toISOString(),
            }
          : s,
      ),
    });
  }
  function createRequest(supplierId: string, title: string, dueAt: string) {
    const relationship = data.relationships.find(
      (r) => r.supplierId === supplierId,
    );
    if (!relationship) throw new Error("Supplier connection missing");
    const requirementIds = data.requirements
      .filter(
        (r) => r.relationshipId === relationship.id && r.status === "missing",
      )
      .map((r) => r.id);
    if (!requirementIds.length)
      throw new Error("This supplier has no missing requirements.");
    const timestamp = new Date().toISOString();
    update({
      ...data,
      requests: [
        {
          id: crypto.randomUUID(),
          relationshipId: relationship.id,
          requirementIds,
          title,
          status: "open",
          requestedAt: timestamp,
          dueAt,
        },
        ...data.requests,
      ],
      activities: [
        {
          id: crypto.randomUUID(),
          supplierId,
          actorId: data.currentUser.id,
          title: "Information request prepared locally",
          description: title,
          occurredAt: timestamp,
          kind: "request",
        },
        ...data.activities,
      ],
    });
  }
  function setProfile(name: string, email: string, company: string) {
    update({
      ...data,
      currentUser: { ...data.currentUser, name, email },
      organization: { ...data.organization, legalName: company },
    });
  }
  return {
    ...data,
    supplierRows,
    expiringCertificates,
    networkStats: {
      total: supplierRows.length,
      complete: data.relationships.filter((r) => r.status === "complete")
        .length,
      missing: data.relationships.filter((r) => r.status === "missing").length,
      expiring: expiringCertificates.length,
    },
    getSupplier: (id: string) => supplierRows.find((r) => r.supplier.id === id),
    addSupplier,
    addDocument,
    saveOrganization,
    setProfile,
    editSupplier,
    createRequest,
    storageError,
  };
}
type WorkspaceValue = ReturnType<typeof useWorkspaceState>;
const Context = createContext<WorkspaceValue | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const workspace = useWorkspaceState();
  return <Context.Provider value={workspace}>{children}</Context.Provider>;
}
export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error("Workspace provider is missing");
  return value;
}
