import { certificates, demoDate, relationships, suppliers } from "./mock";
export const supplierRows = suppliers.map((supplier) => ({
  supplier,
  relationship: relationships.find((r) => r.supplierId === supplier.id)!,
}));
export const getSupplier = (id: string) =>
  supplierRows.find((row) => row.supplier.id === id);
export const daysUntil = (date: string) =>
  Math.ceil((new Date(date).getTime() - demoDate.getTime()) / 86400000);
export const expiringCertificates = certificates.filter(
  (c) => daysUntil(c.validUntil) >= 0 && daysUntil(c.validUntil) <= 30,
);
export const networkStats = {
  total: supplierRows.length,
  complete: relationships.filter((r) => r.status === "complete").length,
  missing: relationships.filter((r) => r.status === "missing").length,
  expiring: expiringCertificates.length,
};
export const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
