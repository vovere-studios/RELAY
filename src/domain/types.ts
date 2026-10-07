export type ID = string;
export type ISODate = string;
export type SupplierStatus = "complete" | "missing" | "attention";
export interface Organization {
  id: ID;
  legalName: string;
  countryCode: string;
  registrationNumber: string;
  website: string;
}
export interface User {
  id: ID;
  organizationId: ID;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
}
/** A reusable company identity, independent of a buyer's relationship. */
export interface Supplier {
  id: ID;
  organizationId: ID;
  legalName: string;
  country: string;
  countryCode: string;
  city: string;
  registrationNumber: string;
  website: string;
  contactName: string;
  contactEmail: string;
  category: string;
  verifiedAt: ISODate | null;
  updatedAt: ISODate;
}
/** Completeness and requirements belong to the buyer–supplier relationship. */
export interface SupplierRelationship {
  id: ID;
  buyerOrganizationId: ID;
  supplierId: ID;
  status: SupplierStatus;
  completeness: number;
  missingRequirements: number;
  createdAt: ISODate;
}
export interface Product {
  id: ID;
  supplierId: ID;
  name: string;
  reference: string;
  material: string;
}
export interface Document {
  id: ID;
  supplierId: ID;
  name: string;
  kind: "certificate" | "declaration" | "company";
  mimeType: string;
  storagePath: string | null;
  uploadedBy: ID | null;
  uploadedAt: ISODate;
  verificationStatus: "unverified" | "verified";
}
export interface Certificate {
  id: ID;
  supplierId: ID;
  documentId: ID;
  standard: string;
  issuer: string;
  validFrom: ISODate;
  validUntil: ISODate;
}
export interface Requirement {
  id: ID;
  relationshipId: ID;
  name: string;
  kind: "document" | "company" | "product";
  status: "satisfied" | "missing";
  documentId: ID | null;
}
export interface DataRequest {
  id: ID;
  relationshipId: ID;
  requirementIds: ID[];
  title: string;
  status: "open" | "received";
  requestedAt: ISODate;
  dueAt: ISODate;
}
export interface Activity {
  id: ID;
  supplierId: ID;
  actorId: ID | null;
  title: string;
  description: string;
  occurredAt: ISODate;
  kind: "document" | "supplier" | "request";
}
