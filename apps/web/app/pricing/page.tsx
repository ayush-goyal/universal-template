import { headers } from "next/headers";
import Link from "next/link";
import { CheckIcon } from "lucide-react";

import { createCaller, createTRPCContext } from "@acme/api";
import { getStripePrices } from "@acme/auth/stripe";
import { STRIPE_PRO_ANNUAL_LOOKUP_KEY, STRIPE_PRO_MONTHLY_LOOKUP_KEY } from "@acme/shared/billing";

import { PricingActions } from "@/components/billing/pricing-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

function formatPrice(amount: number | null, currency: string) {
  if (amount === null) return null;
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 100 === 0 ? 0 : 2,
  }).format(amount / 100);
}

export default async function PricingPage() {
  const context = await createTRPCContext({ headers: new Headers(await headers()) });
  const [prices, billingStatus] = await Promise.all([
    getStripePrices(),
    context.user ? createCaller(context).getStripeBillingStatus() : null,
  ]);
  const monthlyPrice = prices.find((price) => price.lookup_key === STRIPE_PRO_MONTHLY_LOOKUP_KEY);
  const annualPrice = prices.find((price) => price.lookup_key === STRIPE_PRO_ANNUAL_LOOKUP_KEY);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-12">
      <div className="mb-12 flex items-center justify-between">
        <Link className="font-semibold" href="/">
          ACME
        </Link>
        <Button asChild variant="ghost">
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>

      <div className="mx-auto mb-10 max-w-2xl text-center">
        <Badge className="mb-4" variant="secondary">
          Simple pricing
        </Badge>
        <h1 className="text-4xl font-semibold tracking-tight">Choose the plan that fits</h1>
        <p className="text-muted-foreground mt-3">Start free, then upgrade your web account.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <CardDescription>Everything needed to get started.</CardDescription>
            <p className="pt-4 text-3xl font-semibold">$0</p>
          </CardHeader>
          <CardContent className="grid gap-6">
            <ul className="grid gap-3 text-sm">
              <li className="flex items-center gap-2">
                <CheckIcon className="size-4" /> Account access
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="size-4" /> Core application features
              </li>
            </ul>
            <Button asChild className="w-full" variant="outline">
              <Link href="/sign-up">Get started</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>Pro</CardTitle>
              <Badge>Recommended</Badge>
            </div>
            <CardDescription>Pro access for the web application.</CardDescription>
            <div className="space-y-1 pt-4">
              <p className="text-3xl font-semibold">
                {monthlyPrice
                  ? formatPrice(monthlyPrice.unit_amount, monthlyPrice.currency)
                  : "Monthly"}
                <span className="text-muted-foreground text-sm font-normal"> / month</span>
              </p>
              {annualPrice ? (
                <p className="text-muted-foreground text-sm">
                  {formatPrice(annualPrice.unit_amount, annualPrice.currency)} billed annually
                </p>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="grid gap-6">
            <ul className="grid gap-3 text-sm">
              <li className="flex items-center gap-2">
                <CheckIcon className="size-4" /> Pro server features
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="size-4" /> Stripe-hosted subscription management
              </li>
            </ul>
            <PricingActions
              alreadyPro={Boolean(billingStatus?.isPro)}
              monthlyAvailable={Boolean(monthlyPrice)}
              annualAvailable={Boolean(annualPrice)}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
