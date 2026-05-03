"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { toast } from "sonner";

import type { PlanName } from "@acme/shared";
import { PLANS } from "@acme/shared";

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
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/react";

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const trpc = useTRPC();

  const { data: subscriptionData } = useQuery({
    ...trpc.getSubscription.queryOptions(),
    enabled: !!session?.user,
  });

  const planEntries = Object.values(PLANS);

  async function handleUpgrade(planName: PlanName) {
    if (!session?.user) {
      router.push(`/sign-in?redirectTo=${encodeURIComponent("/pricing")}`);
      return;
    }

    if (planName === "free") return;

    try {
      setIsLoading(planName);
      const activeSubscription = subscriptionData?.activeSubscription;
      await authClient.subscription.upgrade({
        plan: planName,
        annual,
        successUrl: "/dashboard?upgraded=true",
        cancelUrl: "/pricing",
        ...(activeSubscription?.stripeSubscriptionId && {
          subscriptionId: activeSubscription.stripeSubscriptionId,
        }),
      });
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String(err.message)
          : "Failed to start checkout. Please try again.";
      toast.error(message);
    } finally {
      setIsLoading(null);
    }
  }

  async function handleManageBilling() {
    try {
      setIsLoading("manage");
      await authClient.subscription.billingPortal({
        returnUrl: "/pricing",
      });
    } catch {
      toast.error("Failed to open billing portal.");
    } finally {
      setIsLoading(null);
    }
  }

  return (
    <main className="flex min-h-screen flex-col">
      <nav className="flex items-center justify-between border-b px-6 py-4">
        <Link href="/" className="text-xl font-bold">
          Acme
        </Link>
        <div className="flex items-center gap-4">
          {session?.user ? (
            <Link href="/dashboard">
              <Button variant="outline">Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link href="/sign-in">
                <Button variant="ghost">Sign in</Button>
              </Link>
              <Link href="/sign-up">
                <Button>Get started</Button>
              </Link>
            </>
          )}
        </div>
      </nav>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-6 py-16">
        <h1 className="text-center text-4xl font-bold tracking-tight">
          Simple, transparent pricing
        </h1>
        <p className="text-muted-foreground mt-4 text-center text-lg">
          Start free and scale as you grow. No hidden fees.
        </p>

        <div className="mt-8 flex items-center gap-3">
          <span className={annual ? "text-muted-foreground" : "font-medium"}>Monthly</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              annual ? "bg-primary" : "bg-muted"
            }`}
            role="switch"
            aria-checked={annual}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
                annual ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <span className={annual ? "font-medium" : "text-muted-foreground"}>
            Annual
            <Badge variant="secondary" className="ml-2">
              Save 20%
            </Badge>
          </span>
        </div>

        <div className="mt-12 grid w-full gap-8 md:grid-cols-2">
          {planEntries.map((plan) => {
            const isCurrentPlan =
              subscriptionData?.activePlan === plan.name ||
              (!subscriptionData?.activePlan && plan.name === "free");
            const price = annual ? plan.annualPrice / 12 : plan.monthlyPrice;

            return (
              <Card
                key={plan.name}
                className={plan.popular ? "border-primary relative shadow-md" : ""}
              >
                {plan.popular && <Badge className="absolute -top-3 right-6">Most popular</Badge>}
                <CardHeader>
                  <CardTitle className="text-xl">{plan.displayName}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">
                      ${price.toFixed(price % 1 === 0 ? 0 : 2)}
                    </span>
                    <span className="text-muted-foreground">/month</span>
                    {annual && plan.monthlyPrice > 0 && (
                      <span className="text-muted-foreground ml-2 text-sm line-through">
                        ${plan.monthlyPrice}
                      </span>
                    )}
                  </div>
                  {plan.trialDays && (
                    <p className="text-muted-foreground text-sm">
                      {plan.trialDays}-day free trial included
                    </p>
                  )}
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  {isCurrentPlan ? (
                    subscriptionData?.isPro ? (
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={handleManageBilling}
                        disabled={isLoading === "manage"}
                      >
                        {isLoading === "manage" ? "Loading..." : "Manage subscription"}
                      </Button>
                    ) : (
                      <Button className="w-full" variant="outline" disabled>
                        Current plan
                      </Button>
                    )
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => handleUpgrade(plan.name)}
                      disabled={isLoading === plan.name}
                    >
                      {isLoading === plan.name
                        ? "Loading..."
                        : plan.trialDays
                          ? `Start ${plan.trialDays}-day free trial`
                          : `Upgrade to ${plan.displayName}`}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </main>
  );
}
