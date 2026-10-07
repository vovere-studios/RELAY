import type {
  Organization,
  User,
  Supplier,
  SupplierRelationship,
  Document,
  Certificate,
  Requirement,
  DataRequest,
  Activity,
  Product,
} from "../domain/types";
export const demoDate = new Date("2026-10-07T10:00:00Z");
export const organization: Organization = {
  id: "org-buyer",
  legalName: "Forma Industries GmbH",
  countryCode: "AT",
  registrationNumber: "FN 428916 k",
  website: "forma.example",
};
export const currentUser: User = {
  id: "user-1",
  organizationId: organization.id,
  name: "Alex Morgan",
  email: "alex@forma.example",
  role: "owner",
};
const names = [
  [
    "Alpina Components GmbH",
    "Austria",
    "AT",
    "Innsbruck",
    "Precision components",
  ],
  ["Nordwerk AG", "Germany", "DE", "Hamburg", "Industrial systems"],
  ["Metalform S.r.l.", "Italy", "IT", "Brescia", "Metal fabrication"],
  ["Tecno Parts d.o.o.", "Slovenia", "SI", "Ljubljana", "Technical components"],
  ["Brückner Materials GmbH", "Germany", "DE", "Munich", "Raw materials"],
  ["Aster Plastics B.V.", "Netherlands", "NL", "Eindhoven", "Polymers"],
  [
    "Helvetic Precision AG",
    "Switzerland",
    "CH",
    "Zürich",
    "Precision components",
  ],
  [
    "Lindholm Manufacturing AB",
    "Sweden",
    "SE",
    "Gothenburg",
    "Industrial systems",
  ],
  ["Vektor Electronics s.r.o.", "Czechia", "CZ", "Brno", "Electronics"],
  ["Maison Industrie SAS", "France", "FR", "Lyon", "Industrial systems"],
  ["Baltic Components OÜ", "Estonia", "EE", "Tallinn", "Technical components"],
  ["Iberia Materials S.L.", "Spain", "ES", "Bilbao", "Raw materials"],
  ["Danube Systems GmbH", "Austria", "AT", "Linz", "Industrial systems"],
  ["Ferro Tools S.p.A.", "Italy", "IT", "Turin", "Metal fabrication"],
  ["Hanseatic Supply GmbH", "Germany", "DE", "Bremen", "Technical components"],
  ["Norden Engineering ApS", "Denmark", "DK", "Aarhus", "Precision components"],
  ["Atlas Packaging B.V.", "Netherlands", "NL", "Rotterdam", "Packaging"],
  ["Prisma Textiles Lda.", "Portugal", "PT", "Porto", "Textiles"],
  ["Morava Steel s.r.o.", "Czechia", "CZ", "Ostrava", "Metal fabrication"],
  ["Sava Materials d.o.o.", "Slovenia", "SI", "Maribor", "Raw materials"],
  ["Lumi Electronics Oy", "Finland", "FI", "Tampere", "Electronics"],
  ["Rhône Components SAS", "France", "FR", "Grenoble", "Technical components"],
  ["Alba Manufacturing S.r.l.", "Italy", "IT", "Milan", "Industrial systems"],
  [
    "Westland Technical B.V.",
    "Netherlands",
    "NL",
    "Delft",
    "Technical components",
  ],
];
export const suppliers: Supplier[] = names.map(
  ([legalName, country, countryCode, city, category], i) => ({
    id: `supplier-${i + 1}`,
    organizationId: `org-supplier-${i + 1}`,
    legalName,
    country,
    countryCode,
    city,
    category,
    registrationNumber: `REG-${countryCode}-${428910 + i}`,
    website: `supplier${i + 1}.example`,
    contactName: i === 0 ? "Anna Weber" : "Supplier team",
    contactEmail: `contact@supplier${i + 1}.example`,
    verifiedAt: i === 2 || i >= 20 ? null : "2026-09-16",
    updatedAt: `2026-10-0${7 - (i % 6)}`,
  }),
);
export const relationships: SupplierRelationship[] = suppliers.map((s, i) => ({
  id: `relationship-${i + 1}`,
  buyerOrganizationId: organization.id,
  supplierId: s.id,
  status:
    i === 1 || i === 4
      ? "attention"
      : i === 2 || i >= 21
        ? "missing"
        : "complete",
  completeness:
    i === 1
      ? 82
      : i === 2
        ? 64
        : i === 3
          ? 96
          : i === 4
            ? 88
            : i >= 21
              ? 60 + (i - 21) * 8
              : 100,
  missingRequirements: i === 2 ? 2 : i >= 21 ? 3 - (i - 21) : 0,
  createdAt: "2026-09-01",
}));
export const documents: Document[] = [
  {
    id: "doc-1",
    supplierId: "supplier-1",
    name: "ISO 9001 · Quality management",
    kind: "certificate",
    mimeType: "application/pdf",
    storagePath: null,
    uploadedBy: null,
    uploadedAt: "2026-10-07",
    verificationStatus: "verified",
  },
  {
    id: "doc-2",
    supplierId: "supplier-1",
    name: "ISO 14001 · Environmental management",
    kind: "certificate",
    mimeType: "application/pdf",
    storagePath: null,
    uploadedBy: null,
    uploadedAt: "2026-09-16",
    verificationStatus: "verified",
  },
  {
    id: "doc-3",
    supplierId: "supplier-1",
    name: "REACH declaration",
    kind: "declaration",
    mimeType: "application/pdf",
    storagePath: null,
    uploadedBy: null,
    uploadedAt: "2026-10-06",
    verificationStatus: "verified",
  },
  {
    id: "doc-4",
    supplierId: "supplier-2",
    name: "ISO 14001 · Environmental management",
    kind: "certificate",
    mimeType: "application/pdf",
    storagePath: null,
    uploadedBy: null,
    uploadedAt: "2026-09-10",
    verificationStatus: "verified",
  },
  {
    id: "doc-5",
    supplierId: "supplier-5",
    name: "ISO 9001 · Quality management",
    kind: "certificate",
    mimeType: "application/pdf",
    storagePath: null,
    uploadedBy: null,
    uploadedAt: "2026-09-08",
    verificationStatus: "verified",
  },
];
export const certificates: Certificate[] = [
  {
    id: "cert-1",
    supplierId: "supplier-1",
    documentId: "doc-1",
    standard: "ISO 9001",
    issuer: "TÜV Austria",
    validFrom: "2025-03-18",
    validUntil: "2028-03-18",
  },
  {
    id: "cert-2",
    supplierId: "supplier-1",
    documentId: "doc-2",
    standard: "ISO 14001",
    issuer: "TÜV Austria",
    validFrom: "2024-11-04",
    validUntil: "2027-11-04",
  },
  {
    id: "cert-3",
    supplierId: "supplier-2",
    documentId: "doc-4",
    standard: "ISO 14001",
    issuer: "TÜV Nord",
    validFrom: "2023-10-30",
    validUntil: "2026-10-30",
  },
  {
    id: "cert-4",
    supplierId: "supplier-5",
    documentId: "doc-5",
    standard: "ISO 9001",
    issuer: "TÜV Süd",
    validFrom: "2023-11-05",
    validUntil: "2026-11-05",
  },
];
export const requirements: Requirement[] = [
  {
    id: "req-1",
    relationshipId: "relationship-1",
    name: "ISO 9001 certificate",
    kind: "document",
    status: "satisfied",
    documentId: "doc-1",
  },
  {
    id: "req-2",
    relationshipId: "relationship-1",
    name: "ISO 14001 certificate",
    kind: "document",
    status: "satisfied",
    documentId: "doc-2",
  },
  {
    id: "req-3",
    relationshipId: "relationship-1",
    name: "REACH declaration",
    kind: "document",
    status: "satisfied",
    documentId: "doc-3",
  },
  {
    id: "req-4",
    relationshipId: "relationship-3",
    name: "REACH declaration",
    kind: "document",
    status: "missing",
    documentId: null,
  },
  {
    id: "req-5",
    relationshipId: "relationship-3",
    name: "Company registration",
    kind: "company",
    status: "missing",
    documentId: null,
  },
];
export const requests: DataRequest[] = [
  {
    id: "request-1",
    relationshipId: "relationship-3",
    requirementIds: ["req-4", "req-5"],
    title: "Company & compliance information",
    status: "open",
    requestedAt: "2026-10-03",
    dueAt: "2026-10-17",
  },
];
export const activities: Activity[] = [
  {
    id: "activity-1",
    supplierId: "supplier-1",
    actorId: null,
    title: "ISO 9001 certificate updated",
    description: "Quality management certificate verified.",
    occurredAt: "2026-10-07T09:12:00Z",
    kind: "document",
  },
  {
    id: "activity-2",
    supplierId: "supplier-24",
    actorId: "user-1",
    title: "Supplier added to the network",
    description: "Supplier relationship created in this demo.",
    occurredAt: "2026-10-07T08:34:00Z",
    kind: "supplier",
  },
  {
    id: "activity-3",
    supplierId: "supplier-1",
    actorId: null,
    title: "REACH declaration received",
    description: "Declaration reviewed and marked complete.",
    occurredAt: "2026-10-06T14:20:00Z",
    kind: "document",
  },
  {
    id: "activity-4",
    supplierId: "supplier-3",
    actorId: "user-1",
    title: "Company information requested",
    description: "Two requirements are awaiting a response.",
    occurredAt: "2026-10-03T10:00:00Z",
    kind: "request",
  },
];
export const products: Product[] = [
  {
    id: "product-1",
    supplierId: "supplier-1",
    name: "Precision mounting bracket",
    reference: "ALP-2048",
    material: "Aluminium EN AW-6061",
  },
  {
    id: "product-2",
    supplierId: "supplier-1",
    name: "Machined housing",
    reference: "ALP-3100",
    material: "Stainless steel 1.4301",
  },
];
