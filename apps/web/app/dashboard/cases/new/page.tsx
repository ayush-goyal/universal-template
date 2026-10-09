"use client";

import type { SyntheticEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function NewCasePage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) ?? "").trim();
    const money = (key: string) => Number(value(key)).toFixed(2);
    try {
      const response = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: value("customerName"),
          invoiceNumber: value("invoiceNumber"),
          outstandingAmount: money("outstandingAmount"),
          customerType: value("customerType"),
          billingEmail: value("billingEmail") || null,
          phone: value("phone") || null,
          invoiceDate: value("invoiceDate"),
          originalAmount: value("originalAmount")
            ? money("originalAmount")
            : money("outstandingAmount"),
          serviceDescription: value("serviceDescription"),
          authorizedContactName: value("authorizedContactName"),
          authorizedContactRole: value("authorizedContactRole") || null,
          preferredContactMethod: "either",
        }),
      });
      const result = (await response.json()) as { case?: { id: string }; error?: string };
      if (!response.ok || !result.case) throw new Error(result.error ?? "Could not create case.");
      router.push(`/dashboard/cases/${result.case.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create case.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl overflow-y-auto pb-8">
      <div className="mb-6">
        <Button asChild variant="link" className="px-0">
          <Link href="/dashboard/cases">← Cases</Link>
        </Button>
        <h1 className="text-3xl font-semibold tracking-tight">New case</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Add the invoice and contact details the assistant will use during a demo call.
        </p>
      </div>
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Customer and invoice</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(event) => void submit(event)} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer name</Label>
              <Input id="customerName" name="customerName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerType">Customer type</Label>
              <select
                id="customerType"
                name="customerType"
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Invoice number</Label>
              <Input id="invoiceNumber" name="invoiceNumber" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceDate">Invoice date</Label>
              <Input id="invoiceDate" name="invoiceDate" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="outstandingAmount">Outstanding amount (USD)</Label>
              <Input
                id="outstandingAmount"
                name="outstandingAmount"
                type="number"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="originalAmount">Original amount (USD)</Label>
              <Input id="originalAmount" name="originalAmount" type="number" min="0" step="0.01" />
            </div>
            <div className="border-border/70 border-t pt-5 sm:col-span-2">
              <h2 className="font-medium">Contact and service</h2>
              <p className="text-muted-foreground mt-1 text-xs">
                Use a controlled inbox for any demo email.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="billingEmail">Billing email</Label>
              <Input id="billingEmail" name="billingEmail" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="authorizedContactName">Authorized contact</Label>
              <Input id="authorizedContactName" name="authorizedContactName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="authorizedContactRole">Contact role</Label>
              <Input
                id="authorizedContactRole"
                name="authorizedContactRole"
                placeholder="Owner or billing contact"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="serviceDescription">Service description</Label>
              <Textarea id="serviceDescription" name="serviceDescription" required />
            </div>
            {error ? (
              <p role="alert" className="text-destructive text-sm sm:col-span-2">
                {error}
              </p>
            ) : null}
            <div className="border-border/70 flex justify-end border-t pt-5 sm:col-span-2">
              <Button type="submit" disabled={busy}>
                {busy ? "Creating…" : "Create case"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
