import type { Metadata } from "next";
import { Suspense } from "react";

import { ProChat } from "@/components/dashboard/pro-chat";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  prefetch(trpc.getStripeBillingStatus.queryOptions());

  return (
    <HydrateClient>
      <Suspense>
        <ProChat />
      </Suspense>
    </HydrateClient>
  );
}
