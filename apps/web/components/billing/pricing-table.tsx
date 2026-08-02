"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { Plan } from "@acme/shared";
import { annualSavingsPercent, formatPrice, PLANS } from "@acme/shared";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEntitlement, useStripeSubscription } from "@/hooks/use-billing";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type BillingInterval = "monthly" | "annual";

export function PricingTable({ plans, canCheckout }: { plans: Plan[]; canCheckout: boolean }) {
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const savings = annualSavingsPercent(PLANS.pro);

  return (
    <div className="flex flex-col items-center gap-8">
      <Tabs value={interval} onValueChange={(value) => setInterval(value as BillingInterval)}>
        <TabsList>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="annual">
            Annual
            {savings > 0 ? (
              <Badge variant="secondary" className="ml-2">
                Save {savings}%
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid w-full gap-6 sm:grid-cols-2">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} interval={interval} canCheckout={canCheckout} />
        ))}
      </div>

      {canCheckout ? null : (
        <p className="text-muted-foreground max-w-md text-center text-sm">
          Checkout is switched off because Stripe is not configured. Set{" "}
          <code className="text-xs">STRIPE_SECRET_KEY</code> and the price IDs in your{" "}
          <code className="text-xs">.env</code> to enable it.
        </p>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  interval,
  canCheckout,
}: {
  plan: Plan;
  interval: BillingInterval;
  canCheckout: boolean;
}) {
  const isPaid = plan.id !== "free";
  const amount = interval === "annual" ? plan.price.annual : plan.price.monthly;

  return (
    <Card className={cn("flex flex-col", isPaid && "border-primary shadow-sm")}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{plan.name}</CardTitle>
          {isPaid ? <Badge>Most popular</Badge> : null}
        </div>
        <CardDescription>{plan.description}</CardDescription>
        <div className="flex items-baseline gap-1 pt-4">
          <span className="text-4xl font-semibold tracking-tight">
            {formatPrice(amount, plan.price.currency)}
          </span>
          <span className="text-muted-foreground text-sm">
            {amount === 0 ? "forever" : interval === "annual" ? "/ year" : "/ month"}
          </span>
        </div>
        {plan.trialDays ? (
          <p className="text-muted-foreground text-xs">
            Includes a {plan.trialDays}-day free trial.
          </p>
        ) : null}
      </CardHeader>

      <CardContent className="flex-1">
        <ul className="space-y-3 text-sm">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <Check className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <PlanCta plan={plan} interval={interval} canCheckout={canCheckout} />
      </CardFooter>
    </Card>
  );
}

function PlanCta({
  plan,
  interval,
  canCheckout,
}: {
  plan: Plan;
  interval: BillingInterval;
  canCheckout: boolean;
}) {
  const router = useRouter();
  const { data: session, isPending: isSessionLoading } = authClient.useSession();
  const { data: entitlement, isPending: isEntitlementLoading } = useEntitlement();
  const { data: stripeSubscription } = useStripeSubscription();
  const [isRedirecting, setIsRedirecting] = useState(false);

  if (isSessionLoading || isEntitlementLoading) {
    return (
      <Button className="w-full" disabled>
        <Loader2 className="animate-spin" aria-hidden />
        Loading
      </Button>
    );
  }

  if (!session) {
    return (
      <Button asChild className="w-full" variant={plan.id === "free" ? "outline" : "default"}>
        <Link href={`/sign-up?redirectTo=${encodeURIComponent("/pricing")}`}>
          {plan.id === "free" ? "Get started" : `Start with ${plan.name}`}
        </Link>
      </Button>
    );
  }

  const currentPlan = entitlement?.plan ?? "free";

  if (plan.id === currentPlan) {
    return (
      <Button className="w-full" variant="outline" disabled>
        Current plan
      </Button>
    );
  }

  // Downgrading is a cancellation, and where you cancel depends on who took the money.
  if (plan.id === "free") {
    return (
      <Button asChild className="w-full" variant="outline">
        <Link href="/dashboard/billing">Manage subscription</Link>
      </Button>
    );
  }

  // Apple and Google forbid changing a store subscription from anywhere but their own UI.
  if (entitlement?.provider === "revenuecat") {
    return (
      <Button className="w-full" variant="outline" disabled>
        Managed on {entitlement.store === "play_store" ? "Google Play" : "the App Store"}
      </Button>
    );
  }

  if (!canCheckout) {
    return (
      <Button className="w-full" variant="outline" disabled>
        Checkout unavailable
      </Button>
    );
  }

  async function upgrade() {
    setIsRedirecting(true);
    const { error } = await authClient.subscription.upgrade({
      plan: plan.id,
      annual: interval === "annual",
      // Without this, switching plans opens a second subscription alongside the first and the
      // customer is billed for both.
      subscriptionId: stripeSubscription?.stripeSubscriptionId ?? undefined,
      successUrl: "/dashboard/billing?checkout=success",
      cancelUrl: "/pricing",
      returnUrl: "/dashboard/billing",
      disableRedirect: false,
    });

    if (error) {
      setIsRedirecting(false);
      toast.error(error.message ?? "Could not start checkout.");
      return;
    }

    // A plan change applied through the billing portal resolves without navigating away.
    router.refresh();
  }

  return (
    <Button className="w-full" onClick={() => void upgrade()} disabled={isRedirecting}>
      {isRedirecting ? <Loader2 className="animate-spin" aria-hidden /> : null}
      {stripeSubscription ? `Switch to ${plan.name}` : `Upgrade to ${plan.name}`}
    </Button>
  );
}
