"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PRO_PLAN } from "@acme/shared/billing";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function PricingActions({
  annualAvailable,
  alreadyPro,
  monthlyAvailable,
}: {
  annualAvailable: boolean;
  alreadyPro: boolean;
  monthlyAvailable: boolean;
}) {
  const [pendingInterval, setPendingInterval] = useState<"month" | "year" | null>(null);
  const router = useRouter();
  const { data: session } = authClient.useSession();

  async function subscribe(annual: boolean) {
    if (!session) {
      router.push("/sign-in?redirectTo=/pricing");
      return;
    }

    const interval = annual ? "year" : "month";
    setPendingInterval(interval);
    const { error } = await authClient.subscription.upgrade({
      plan: PRO_PLAN,
      annual,
      successUrl: "/dashboard/settings/billing?checkout=success",
      cancelUrl: "/pricing",
    });
    setPendingInterval(null);

    if (error) toast.error(error.message);
  }

  if (alreadyPro) {
    return (
      <Button asChild className="w-full">
        <Link href="/dashboard/settings/billing">Pro is active</Link>
      </Button>
    );
  }

  return (
    <div className="grid gap-2">
      <Button
        className="w-full"
        disabled={!monthlyAvailable || pendingInterval !== null}
        onClick={() => void subscribe(false)}
      >
        {pendingInterval === "month" ? "Opening checkout…" : "Choose monthly"}
      </Button>
      <Button
        className="w-full"
        disabled={!annualAvailable || pendingInterval !== null}
        variant="outline"
        onClick={() => void subscribe(true)}
      >
        {pendingInterval === "year" ? "Opening checkout…" : "Choose annual"}
      </Button>
    </div>
  );
}
