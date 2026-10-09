"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const money = z
  .string()
  .regex(/^\d{1,10}\.\d{2}$/, "Use a dollar amount with two decimals, such as 480.00")
  .refine(
    (value) => !/^\d{1,10}\.\d{2}$/.test(value) || BigInt(value.replace(".", "")) > 0n,
    "Amount must be greater than zero"
  );
const dateOnly = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Enter a valid date");

const schema = z.object({
  customerName: z.string().trim().min(1, "Customer name is required").max(255),
  invoiceNumber: z.string().trim().min(1, "Invoice number is required").max(255),
  outstandingAmount: money,
  customerType: z.enum(["residential", "commercial"]),
  billingEmail: z.email("Enter a valid billing email"),
  phone: z.string().max(100),
  invoiceDate: dateOnly,
  originalAmount: money,
  serviceDescription: z.string().trim().min(1, "Service description is required").max(2000),
  serviceDate: z.string(),
  authorizedContactName: z.string().trim().min(1, "Authorized contact is required").max(255),
  authorizedContactRole: z.string().max(255),
  preferredContactMethod: z.enum(["email", "phone", "either", "none"]),
  doNotEmail: z.boolean(),
  doNotCall: z.boolean(),
});

type Values = z.infer<typeof schema>;

export type CaseEditorRecord = {
  customerName: string;
  invoiceNumber: string;
  outstandingAmount: string;
  status?: string;
  caseData: Record<string, unknown>;
};

type CaseEditorProps = {
  caseId: string;
  initialCase: CaseEditorRecord;
  onSaved: () => void;
};

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function defaults(record: CaseEditorRecord): Values {
  const data = record.caseData ?? {};
  return {
    customerName: record.customerName,
    invoiceNumber: record.invoiceNumber,
    outstandingAmount: record.outstandingAmount,
    customerType: data.customerType === "commercial" ? "commercial" : "residential",
    billingEmail: stringValue(data.billingEmail),
    phone: stringValue(data.phone),
    invoiceDate: stringValue(data.invoiceDate),
    originalAmount: stringValue(data.originalAmount, record.outstandingAmount),
    serviceDescription: stringValue(data.serviceDescription),
    serviceDate: stringValue(data.serviceDate),
    authorizedContactName: stringValue(data.authorizedContactName, record.customerName),
    authorizedContactRole: stringValue(data.authorizedContactRole),
    preferredContactMethod: ["email", "phone", "either", "none"].includes(
      String(data.preferredContactMethod)
    )
      ? (data.preferredContactMethod as Values["preferredContactMethod"])
      : "email",
    doNotEmail: data.doNotEmail === true,
    doNotCall: data.doNotCall === true,
  };
}

function normalizedMoney(value: string) {
  const match = /^(\d+)(?:\.(\d{0,2}))?$/.exec(value.trim());
  return match ? `${match[1]}.${(match[2] ?? "").padEnd(2, "0")}` : value;
}

export function CaseEditor({ caseId, initialCase, onSaved }: CaseEditorProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: defaults(initialCase),
  });
  const { reset } = form;
  const { errors, isSubmitting } = form.formState;
  const disabled = isSubmitting || initialCase.status === "in_call";

  useEffect(() => {
    reset(defaults(initialCase));
  }, [reset, initialCase]);

  async function save(values: Values) {
    setServerError(null);
    if (values.serviceDate && !dateOnly.safeParse(values.serviceDate).success) {
      form.setError("serviceDate", { message: "Enter a valid service date" });
      return;
    }
    try {
      const response = await fetch(`/api/cases/${encodeURIComponent(caseId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: values.customerName,
          invoiceNumber: values.invoiceNumber,
          outstandingAmount: values.outstandingAmount,
          caseData: {
            customerType: values.customerType,
            billingEmail: values.billingEmail,
            phone: values.phone || null,
            invoiceDate: values.invoiceDate,
            originalAmount: values.originalAmount,
            serviceDescription: values.serviceDescription,
            serviceDate: values.serviceDate || null,
            authorizedContactName: values.authorizedContactName,
            authorizedContactRole: values.authorizedContactRole || null,
            preferredContactMethod: values.preferredContactMethod,
            doNotEmail: values.doNotEmail,
            doNotCall: values.doNotCall,
          },
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not save case.");
      onSaved();
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Could not save case.");
    }
  }

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Edit case details</CardTitle>
        <CardDescription>
          Update invoice, contact, and service facts for future calls.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(save)} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <h3 className="text-sm font-semibold">Invoice</h3>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-customer-name">Customer name</Label>
            <Input
              id="edit-customer-name"
              disabled={disabled}
              aria-invalid={!!errors.customerName}
              {...form.register("customerName")}
            />
            {errors.customerName && (
              <p className="text-destructive text-xs">{errors.customerName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-customer-type">Customer type</Label>
            <select
              id="edit-customer-type"
              disabled={disabled}
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              {...form.register("customerType")}
            >
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-invoice-number">Invoice number</Label>
            <Input
              id="edit-invoice-number"
              disabled={disabled}
              aria-invalid={!!errors.invoiceNumber}
              {...form.register("invoiceNumber")}
            />
            {errors.invoiceNumber && (
              <p className="text-destructive text-xs">{errors.invoiceNumber.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-invoice-date">Invoice date</Label>
            <Input
              id="edit-invoice-date"
              type="date"
              disabled={disabled}
              aria-invalid={!!errors.invoiceDate}
              {...form.register("invoiceDate")}
            />
            {errors.invoiceDate && (
              <p className="text-destructive text-xs">{errors.invoiceDate.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-outstanding">Outstanding amount (USD)</Label>
            <Input
              id="edit-outstanding"
              inputMode="decimal"
              disabled={disabled}
              aria-invalid={!!errors.outstandingAmount}
              {...form.register("outstandingAmount", {
                onBlur: (event) =>
                  form.setValue("outstandingAmount", normalizedMoney(event.target.value)),
              })}
            />
            {errors.outstandingAmount && (
              <p className="text-destructive text-xs">{errors.outstandingAmount.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-original">Original amount (USD)</Label>
            <Input
              id="edit-original"
              inputMode="decimal"
              disabled={disabled}
              aria-invalid={!!errors.originalAmount}
              {...form.register("originalAmount", {
                onBlur: (event) =>
                  form.setValue("originalAmount", normalizedMoney(event.target.value)),
              })}
            />
            {errors.originalAmount && (
              <p className="text-destructive text-xs">{errors.originalAmount.message}</p>
            )}
          </div>
          <div className="border-border/70 border-t pt-5 sm:col-span-2">
            <h3 className="text-sm font-semibold">Contact and service</h3>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-billing-email">Billing email</Label>
            <Input
              id="edit-billing-email"
              type="email"
              disabled={disabled}
              aria-invalid={!!errors.billingEmail}
              {...form.register("billingEmail")}
            />
            {errors.billingEmail && (
              <p className="text-destructive text-xs">{errors.billingEmail.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-phone">Phone</Label>
            <Input
              id="edit-phone"
              type="tel"
              disabled={disabled}
              aria-invalid={!!errors.phone}
              {...form.register("phone")}
            />
            {errors.phone && <p className="text-destructive text-xs">{errors.phone.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-authorized-contact">Authorized billing contact</Label>
            <Input
              id="edit-authorized-contact"
              disabled={disabled}
              aria-invalid={!!errors.authorizedContactName}
              {...form.register("authorizedContactName")}
            />
            {errors.authorizedContactName && (
              <p className="text-destructive text-xs">{errors.authorizedContactName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-authorized-role">Contact role</Label>
            <Input
              id="edit-authorized-role"
              disabled={disabled}
              aria-invalid={!!errors.authorizedContactRole}
              {...form.register("authorizedContactRole")}
            />
            {errors.authorizedContactRole && (
              <p className="text-destructive text-xs">{errors.authorizedContactRole.message}</p>
            )}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="edit-service">Service description</Label>
            <Textarea
              id="edit-service"
              rows={3}
              disabled={disabled}
              aria-invalid={!!errors.serviceDescription}
              {...form.register("serviceDescription")}
            />
            {errors.serviceDescription && (
              <p className="text-destructive text-xs">{errors.serviceDescription.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-service-date">Service date</Label>
            <Input
              id="edit-service-date"
              type="date"
              disabled={disabled}
              aria-invalid={!!errors.serviceDate}
              {...form.register("serviceDate")}
            />
            {errors.serviceDate && (
              <p className="text-destructive text-xs">{errors.serviceDate.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-contact-method">Preferred contact</Label>
            <select
              id="edit-contact-method"
              disabled={disabled}
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              {...form.register("preferredContactMethod")}
            >
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="either">Either</option>
              <option value="none">None</option>
            </select>
          </div>
          <div className="border-border/70 border-t pt-5 sm:col-span-2">
            <h3 className="text-sm font-semibold">Contact restrictions</h3>
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              id="edit-no-email"
              type="checkbox"
              disabled={disabled}
              className="accent-primary size-4"
              {...form.register("doNotEmail")}
            />
            <Label htmlFor="edit-no-email">Do not email</Label>
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              id="edit-no-call"
              type="checkbox"
              disabled={disabled}
              className="accent-primary size-4"
              {...form.register("doNotCall")}
            />
            <Label htmlFor="edit-no-call">Do not call</Label>
          </div>
          {initialCase.status === "in_call" && (
            <p className="text-muted-foreground text-sm sm:col-span-2">
              Finish the active call before editing the case.
            </p>
          )}
          {serverError && (
            <p role="alert" className="text-destructive text-sm sm:col-span-2">
              {serverError}
            </p>
          )}
          <div className="border-border/70 flex justify-end border-t pt-5 sm:col-span-2">
            <Button type="submit" disabled={disabled}>
              {isSubmitting ? "Saving…" : "Save details"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
