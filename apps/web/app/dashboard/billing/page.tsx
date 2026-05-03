"use client";

import { useQuery } from "@tanstack/react-query";
import { CreditCard, ExternalLink } from "lucide-react";
import { DateTime } from "luxon";
import { toast } from "sonner";

import type { PlanName } from "@acme/shared";
import { PLANS } from "@acme/shared";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/react";

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return DateTime.fromJSDate(new Date(date)).toLocaleString(DateTime.DATE_MED);
}

export default function BillingPage() {
  const trpc = useTRPC();
  const { data: subscriptionData, isLoading } = useQuery(trpc.getSubscription.queryOptions());

  const activePlan = PLANS[(subscriptionData?.activePlan ?? "free") as PlanName];
  const activeSub = subscriptionData?.activeSubscription;

  async function handleManageBilling() {
    try {
      await authClient.subscription.billingPortal({
        returnUrl: "/dashboard/billing",
      });
    } catch {
      toast.error("Failed to open billing portal.");
    }
  }

  async function handleUpgrade() {
    try {
      await authClient.subscription.upgrade({
        plan: "pro",
        successUrl: "/dashboard/billing?upgraded=true",
        cancelUrl: "/dashboard/billing",
      });
    } catch {
      toast.error("Failed to start checkout.");
    }
  }

  if (isLoading) {
    return (
      <div className="container space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Billing</h1>
          <p className="text-muted-foreground mt-1">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="text-muted-foreground mt-1">Manage your subscription and billing details.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>
                You are on the{" "}
                <span className="font-semibold">{activePlan?.displayName ?? "Free"}</span> plan.
              </CardDescription>
            </div>
            <Badge variant={subscriptionData?.isPro ? "default" : "secondary"}>
              {activePlan?.displayName ?? "Free"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeSub && (
            <>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium capitalize">{activeSub.status ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Billing interval</p>
                  <p className="font-medium capitalize">{activeSub.billingInterval ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Current period ends</p>
                  <p className="font-medium">{formatDate(activeSub.periodEnd)}</p>
                </div>
                {activeSub.trialEnd && (
                  <div>
                    <p className="text-muted-foreground">Trial ends</p>
                    <p className="font-medium">{formatDate(activeSub.trialEnd)}</p>
                  </div>
                )}
              </div>
              {activeSub.cancelAtPeriodEnd && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm dark:border-yellow-900 dark:bg-yellow-950">
                  Your subscription is set to cancel at the end of the current billing period (
                  {formatDate(activeSub.periodEnd)}).
                </div>
              )}
            </>
          )}

          <Separator />

          <div className="flex flex-wrap gap-3">
            {subscriptionData?.isPro ? (
              <Button variant="outline" onClick={handleManageBilling}>
                <CreditCard className="mr-2 h-4 w-4" />
                Manage subscription
                <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
            ) : (
              <Button onClick={handleUpgrade}>Upgrade to Pro</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan Limits</CardTitle>
          <CardDescription>Your current usage limits based on your plan.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Projects</p>
              <p className="text-2xl font-bold">{subscriptionData?.limits.projects ?? 3}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Storage</p>
              <p className="text-2xl font-bold">{subscriptionData?.limits.storage ?? 1} GB</p>
            </div>
            <div>
              <p className="text-muted-foreground">API Requests</p>
              <p className="text-2xl font-bold">
                {((subscriptionData?.limits.apiRequests ?? 1000) / 1000).toFixed(0)}k
              </p>
              <p className="text-muted-foreground text-xs">per month</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
