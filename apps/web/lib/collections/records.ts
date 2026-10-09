import type { CollectionCase } from "@acme/db";

export type JsonRecord = Record<string, unknown>;

export function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function caseView(row: CollectionCase) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    customerName: row.customerName,
    invoiceNumber: row.invoiceNumber,
    outstandingAmount: row.outstandingAmount.toFixed(2),
    originalAmount: row.originalAmount?.toFixed(2) ?? null,
    customerType: row.customerType,
    billingEmail: row.billingEmail,
    phone: row.phone,
    invoiceDate: row.invoiceDate,
    serviceDate: row.serviceDate,
    serviceDescription: row.serviceDescription,
    authorizedContactName: row.authorizedContactName,
    authorizedContactRole: row.authorizedContactRole,
    preferredContactMethod: row.preferredContactMethod,
    assignedAgentId: row.assignedAgentId,
    doNotEmail: row.doNotEmail,
    doNotCall: row.doNotCall,
    currency: row.currency,
    status: row.status,
    caseData: row.caseData,
    notes: row.notes,
    followUp: row.followUp,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function moneyString(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{1,10}\.\d{2}$/.test(value)) return null;
  if (BigInt(value.replace(".", "")) <= 0n) return null;
  return value;
}

export function dateOnly(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
    ? value
    : null;
}

export function shortString(value: unknown, max = 255): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= max ? trimmed : null;
}

export function emailString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : null;
}

export function caseDetailsFromInput(value: unknown, customerName: string) {
  const data = asRecord(value);
  if (!data) return null;
  const customerType = data.customerType;
  const billingEmail = emailString(data.billingEmail);
  const invoiceDate = dateOnly(data.invoiceDate);
  const originalAmount = moneyString(data.originalAmount);
  const serviceDescription = shortString(data.serviceDescription, 2000);
  const authorizedContactName = shortString(data.authorizedContactName ?? customerName);
  if (
    (customerType !== "residential" && customerType !== "commercial") ||
    !billingEmail ||
    !invoiceDate ||
    !originalAmount ||
    !serviceDescription ||
    !authorizedContactName
  )
    return null;
  const serviceDate =
    data.serviceDate === null || data.serviceDate === undefined ? null : dateOnly(data.serviceDate);
  if (data.serviceDate && !serviceDate) return null;
  const preferredContactMethod = data.preferredContactMethod ?? "email";
  if (!["email", "phone", "either", "none"].includes(String(preferredContactMethod))) return null;
  return {
    customerType,
    billingEmail,
    phone: typeof data.phone === "string" ? data.phone.trim().slice(0, 100) : null,
    invoiceDate,
    originalAmount,
    serviceDescription,
    serviceDate,
    authorizedContactName,
    authorizedContactRole:
      typeof data.authorizedContactRole === "string"
        ? data.authorizedContactRole.trim().slice(0, 255)
        : null,
    assignedAgentId:
      typeof data.assignedAgentId === "string" && data.assignedAgentId.trim()
        ? data.assignedAgentId.trim()
        : null,
    preferredContactMethod: String(preferredContactMethod),
    doNotEmail: data.doNotEmail === true,
    doNotCall: data.doNotCall === true,
  };
}

export function caseDetails(row: CollectionCase) {
  return {
    customerType: row.customerType,
    billingEmail: row.billingEmail,
    phone: row.phone,
    invoiceDate: row.invoiceDate,
    originalAmount: row.originalAmount?.toFixed(2),
    serviceDescription: row.serviceDescription,
    serviceDate: row.serviceDate,
    authorizedContactName: row.authorizedContactName,
    authorizedContactRole: row.authorizedContactRole,
    assignedAgentId: row.assignedAgentId,
    preferredContactMethod: row.preferredContactMethod,
    doNotEmail: row.doNotEmail,
    doNotCall: row.doNotCall,
  };
}
