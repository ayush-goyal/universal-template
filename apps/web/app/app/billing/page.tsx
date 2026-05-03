"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ExternalLink, X } from "lucide-react";
import { toast } from "sonner";
import { useTRPC } from "trpc/react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function redirectTo(url: string) {
  if (typeof window !== "undefined") window.location.href = url;
}

export default function BillingPage() {
  const trpc = useTRPC();
  const subscription = useQuery(trpc.subscription.status.queryOptions());

  const portal = useMutation(
    trpc.subscription.portal.mutationOptions({
      onSuccess: (data) => {
        if (data.url) redirectTo(data.url);
      },
      onError: (e) => toast.error(e.message),
    })
  );

  const cancel = useMutation(
    trpc.subscription.cancel.mutationOptions({
      onSuccess: (data) => {
        if (data.url) redirectTo(data.url);
        else toast.success("Cancellation scheduled");
      },
      onError: (e) => toast.error(e.message),
    })
  );

  function openPortal() {
    if (typeof window === "undefined") return;
    portal.mutate({ returnUrl: window.location.href });
  }

  function cancelSubscription() {
    if (typeof window === "undefined") return;
    if (!window.confirm("Cancel your Pro subscription at the end of the billing period?")) {
      return;
    }
    cancel.mutate({ returnUrl: window.location.href });
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-base font-medium capitalize">
                {subscription.data?.plan ?? "free"} plan
              </p>
              <p className="text-muted-foreground text-sm">
                Status: {subscription.data?.status ?? "—"}
                {subscription.data?.currentPeriodEnd ? (
                  <>
                    {" · Renews "}
                    {new Date(subscription.data.currentPeriodEnd).toLocaleDateString()}
                  </>
                ) : null}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={openPortal} disabled={portal.isPending}>
                <ExternalLink className="size-4" />
                {portal.isPending ? "Opening…" : "Manage subscription"}
              </Button>
              {subscription.data?.plan === "pro" && !subscription.data.cancelAtPeriodEnd ? (
                <Button
                  variant="ghost"
                  onClick={cancelSubscription}
                  disabled={cancel.isPending}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="size-4" />
                  {cancel.isPending ? "Canceling…" : "Cancel"}
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
