"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, RotateCcw, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";
import { useTRPC } from "trpc/react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function redirectTo(url: string) {
  if (typeof window !== "undefined") window.location.href = url;
}

export default function BillingPage() {
  const trpc = useTRPC();
  const qc = useQueryClient();
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
        if (data.url) {
          redirectTo(data.url);
        } else {
          toast.success("Cancellation scheduled — Pro stays active until period end.");
          void qc.invalidateQueries({
            queryKey: trpc.subscription.status.queryKey(),
          });
        }
      },
      onError: (e) => toast.error(e.message),
    })
  );

  const restore = useMutation(
    trpc.subscription.restore.mutationOptions({
      onSuccess: () => {
        toast.success("Welcome back — your subscription is active again.");
        void qc.invalidateQueries({
          queryKey: trpc.subscription.status.queryKey(),
        });
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

  const sub = subscription.data;
  const isPro = sub?.plan === "pro";
  const scheduledToCancel = !!sub?.cancelAtPeriodEnd;

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
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-base font-medium capitalize">{sub?.plan ?? "free"} plan</p>
                <p className="text-muted-foreground text-sm">
                  Status: {sub?.status ?? "—"}
                  {sub?.currentPeriodEnd ? (
                    <>
                      {" · "}
                      {scheduledToCancel ? "Ends " : "Renews "}
                      {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                    </>
                  ) : null}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={openPortal} disabled={portal.isPending}>
                  <ExternalLink className="size-4" />
                  {portal.isPending ? "Opening…" : "Manage subscription"}
                </Button>
                {isPro && !scheduledToCancel ? (
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

            {scheduledToCancel ? (
              <div className="flex flex-wrap items-center gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900/40 dark:bg-amber-950/30">
                <TriangleAlert className="size-4 text-amber-600 dark:text-amber-300" />
                <span className="text-amber-900 dark:text-amber-200">
                  Your subscription is scheduled to cancel at the end of the billing period.
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => restore.mutate()}
                  disabled={restore.isPending}
                  className="ml-auto"
                >
                  <RotateCcw className="size-4" />
                  {restore.isPending ? "Resuming…" : "Resume subscription"}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
