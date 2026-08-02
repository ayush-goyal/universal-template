"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, CreditCard, ExternalLink, Loader2, Smartphone } from "lucide-react";
import { DateTime } from "luxon";
import { toast } from "sonner";

import { getPlan, isManageableOnWeb } from "@acme/shared";

import { PlanBadge } from "@/components/billing/plan-badge";
import { UsageMeter } from "@/components/billing/usage-meter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useEntitlement, useRefreshBilling, useStripeSubscription } from "@/hooks/use-billing";
import { authClient } from "@/lib/auth-client";

/** Two forms because the same name has to read correctly as a subject and after "your". */
const STORES: Record<string, { subject: string; possessive: string }> = {
  app_store: { subject: "The App Store", possessive: "App Store" },
  play_store: { subject: "Google Play", possessive: "Google Play" },
};

const UNKNOWN_STORE = { subject: "The store", possessive: "store" };

export function SubscriptionCard() {
  const { data: entitlement, isPending } = useEntitlement();
  const { data: stripeSubscription } = useStripeSubscription();
  const refreshBilling = useRefreshBilling();
  const searchParams = useSearchParams();
  const [pendingAction, setPendingAction] = useState<"portal" | "restore" | null>(null);

  const justCheckedOut = searchParams.get("checkout") === "success";

  // Stripe's webhook and the redirect back from Checkout race each other, so the first read after
  // paying can still say "Free". Ask again once the page settles.
  useEffect(() => {
    if (!justCheckedOut) return;
    const timer = setTimeout(() => void refreshBilling(), 1500);
    return () => clearTimeout(timer);
  }, [justCheckedOut, refreshBilling]);

  if (isPending || !entitlement) {
    return <Skeleton className="h-64 w-full" />;
  }

  const plan = getPlan(entitlement.plan);
  const store = (entitlement.store ? STORES[entitlement.store] : undefined) ?? UNKNOWN_STORE;
  const isMetered = entitlement.limits.aiMessagesPerDay !== null;

  async function openBillingPortal() {
    setPendingAction("portal");
    const { error } = await authClient.subscription.billingPortal({
      returnUrl: "/dashboard/billing",
    });
    if (error) {
      setPendingAction(null);
      toast.error(error.message ?? "Could not open the billing portal.");
    }
  }

  async function restoreSubscription() {
    setPendingAction("restore");
    const { error } = await authClient.subscription.restore({
      subscriptionId: stripeSubscription?.stripeSubscriptionId ?? undefined,
    });
    setPendingAction(null);

    if (error) {
      toast.error(error.message ?? "Could not restore your subscription.");
      return;
    }

    await refreshBilling();
    toast.success("Your subscription will renew as normal.");
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Your plan</CardTitle>
            <CardDescription>{plan.description}</CardDescription>
          </div>
          <PlanBadge entitlement={entitlement} />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {justCheckedOut ? (
          <Alert>
            <AlertTitle>Payment received</AlertTitle>
            <AlertDescription>
              Thanks for subscribing. It can take a few seconds for the change to appear here.
            </AlertDescription>
          </Alert>
        ) : null}

        {entitlement.status === "past_due" ? (
          <Alert variant="destructive">
            <AlertTitle>We could not take your last payment</AlertTitle>
            <AlertDescription>
              Your access continues while the payment is retried. Update your payment method to
              avoid losing it.
            </AlertDescription>
          </Alert>
        ) : null}

        {entitlement.isPro && !isManageableOnWeb(entitlement) ? (
          <Alert>
            <Smartphone className="size-4" aria-hidden />
            <AlertTitle>Bought in the mobile app</AlertTitle>
            <AlertDescription>
              {store.subject} handles this subscription. Change or cancel it in your{" "}
              {store.possessive} account settings.
            </AlertDescription>
          </Alert>
        ) : null}

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Plan</dt>
            <dd className="font-medium">{plan.name}</dd>
          </div>
          {entitlement.currentPeriodEnd ? (
            <div>
              <dt className="text-muted-foreground">
                {entitlement.cancelAtPeriodEnd ? "Access ends" : "Renews"}
              </dt>
              <dd className="font-medium">
                {DateTime.fromJSDate(entitlement.currentPeriodEnd).toLocaleString(
                  DateTime.DATE_MED
                )}
              </dd>
            </div>
          ) : null}
        </dl>

        {entitlement.cancelAtPeriodEnd ? (
          <Alert>
            <AlertTitle>Set to cancel</AlertTitle>
            <AlertDescription>
              You keep {plan.name} until the date above, then move to the Free plan.
            </AlertDescription>
          </Alert>
        ) : null}

        <Separator />

        {/* An unlimited plan has no meter to show, so list what it buys instead of leaving the
            card ending on a separator with nothing under it. */}
        {isMetered ? (
          <UsageMeter />
        ) : (
          <ul className="space-y-2 text-sm">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <Check className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap gap-3">
        {entitlement.isPro && isManageableOnWeb(entitlement) ? (
          <Button onClick={() => void openBillingPortal()} disabled={pendingAction !== null}>
            {pendingAction === "portal" ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <CreditCard aria-hidden />
            )}
            Manage billing
          </Button>
        ) : null}

        {entitlement.cancelAtPeriodEnd && isManageableOnWeb(entitlement) ? (
          <Button
            variant="outline"
            onClick={() => void restoreSubscription()}
            disabled={pendingAction !== null}
          >
            {pendingAction === "restore" ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Keep my subscription
          </Button>
        ) : null}

        <Button asChild variant={entitlement.isPro ? "outline" : "default"}>
          <Link href="/pricing">
            {entitlement.isPro ? "Compare plans" : "Upgrade to Pro"}
            <ExternalLink aria-hidden />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
