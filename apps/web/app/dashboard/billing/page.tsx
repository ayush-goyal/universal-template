import type { Metadata } from "next";
import { Suspense } from "react";

import { SubscriptionCard } from "@/components/billing/subscription-card";
import { Skeleton } from "@/components/ui/skeleton";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Billing",
};

export default function BillingPage() {
  prefetch(trpc.getEntitlement.queryOptions());
  prefetch(trpc.getUsage.queryOptions());

  return (
    <main className="mx-auto w-full max-w-2xl py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-muted-foreground text-sm">
          Manage your plan, payment method and invoices.
        </p>
      </div>

      <HydrateClient>
        {/* SubscriptionCard reads the ?checkout= redirect param, which needs a Suspense boundary. */}
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <SubscriptionCard />
        </Suspense>
      </HydrateClient>
    </main>
  );
}
