"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { toast } from "sonner";

import type { BillingStatus } from "@acme/shared/billing";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/react";

export function BillingSettings({ initialStatus }: { initialStatus: BillingStatus }) {
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const trpc = useTRPC();
  const { data } = useQuery({
    ...trpc.getStripeBillingStatus.queryOptions(),
    initialData: initialStatus,
  });

  async function openStripePortal() {
    setIsOpeningPortal(true);
    const { error } = await authClient.subscription.billingPortal({
      returnUrl: "/dashboard/settings/billing",
    });
    setIsOpeningPortal(false);
    if (error) toast.error(error.message);
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-muted-foreground mt-1">Manage your web subscription with Stripe.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>{data.isPro ? "Pro" : "Free"}</CardTitle>
              <CardDescription>
                {data.isPro
                  ? "Your account has Pro access."
                  : "Upgrade when you need Pro features."}
              </CardDescription>
            </div>
            <Badge variant={data.isPro ? "default" : "secondary"}>{data.plan}</Badge>
          </div>
        </CardHeader>
        {!data.isPro ? (
          <CardContent>
            <Button asChild>
              <Link href="/pricing">View Pro</Link>
            </Button>
          </CardContent>
        ) : null}
      </Card>

      {data.subscriptions.map((subscription) => (
        <Card key={`${subscription.source}-${subscription.id}`}>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base">Stripe</CardTitle>
                <CardDescription>
                  {subscription.willRenew ? "Renews" : "Access ends"}{" "}
                  {subscription.currentPeriodEndsAt
                    ? DateTime.fromJSDate(subscription.currentPeriodEndsAt).toLocaleString(
                        DateTime.DATE_MED
                      )
                    : "on the provider's schedule"}
                </CardDescription>
              </div>
              <Badge variant="outline">{subscription.status.replaceAll("_", " ")}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Button disabled={isOpeningPortal} onClick={() => void openStripePortal()}>
              {isOpeningPortal ? "Opening…" : "Manage with Stripe"}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
