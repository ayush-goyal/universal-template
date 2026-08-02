import type { Metadata } from "next";
import Link from "next/link";

import { ALL_PLANS } from "@acme/shared";

import { PricingTable } from "@/components/billing/pricing-table";
import { Button } from "@/components/ui/button";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple pricing. Start free, upgrade when you need more.",
};

export default function PricingPage() {
  // Prefetched so the cards render with the right call to action on first paint instead of
  // flashing "Upgrade" at somebody who already pays.
  prefetch(trpc.getEntitlement.queryOptions());

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16">
      <div className="mb-12 flex flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Simple pricing</h1>
        <p className="text-muted-foreground max-w-xl">
          Start free and upgrade when you need more. Cancel at any time.
        </p>
      </div>

      <HydrateClient>
        <PricingTable plans={ALL_PLANS} />
      </HydrateClient>

      <div className="mt-12 flex flex-col items-center gap-2 text-center">
        <p className="text-muted-foreground text-sm">
          Subscriptions bought in the iOS or Android app are billed by Apple or Google and are
          managed there.
        </p>
        <Button asChild variant="link">
          <Link href="/dashboard">Back to the dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
