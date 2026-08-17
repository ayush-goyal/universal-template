import { headers } from "next/headers";

import { createCaller, createTRPCContext } from "@acme/api";

import { BillingSettings } from "@/components/billing/billing-settings";

export default async function BillingPage() {
  const context = await createTRPCContext({ headers: new Headers(await headers()) });
  if (!context.user) return null;

  const billingStatus = await createCaller(context).getStripeBillingStatus();
  return <BillingSettings initialStatus={billingStatus} />;
}
