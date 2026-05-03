"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useTRPC } from "trpc/react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";

export default function BillingPage() {
  const trpc = useTRPC();
  const subscription = useQuery(trpc.subscription.status.queryOptions());

  async function openPortal() {
    try {
      // Better Auth Stripe plugin exposes this via the auth-client.
      const result = await authClient.subscription.billingPortal({
        returnUrl: window.location.href,
      });
      if (result?.error) throw new Error(result.error.message);
      // Some versions return { url }
      const data = result?.data as { url?: string } | undefined;
      if (data?.url) window.location.href = data.url;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not open billing portal";
      toast.error(message);
    }
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6 md:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-muted-foreground text-sm">Manage your subscription.</p>
      </header>

      <div className="bg-card rounded-lg border p-5">
        {subscription.isLoading ? (
          <Skeleton className="h-12 w-full" />
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-medium capitalize">
                {subscription.data?.plan ?? "free"} plan
              </p>
              <p className="text-muted-foreground text-sm">
                Status: {subscription.data?.status ?? "—"}
              </p>
            </div>
            <Button variant="outline" onClick={openPortal}>
              <ExternalLink className="size-4" /> Manage subscription
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
