"use client";

import type { Entitlement } from "@acme/shared";
import { getPlan } from "@acme/shared";

import { Badge } from "@/components/ui/badge";

const STATUS_LABELS: Partial<Record<Entitlement["status"], string>> = {
  trialing: "Trial",
  past_due: "Payment due",
};

export function PlanBadge({ entitlement }: { entitlement: Entitlement }) {
  const plan = getPlan(entitlement.plan);
  const status = STATUS_LABELS[entitlement.status];

  return (
    <Badge variant={entitlement.isPro ? "default" : "secondary"}>
      {plan.name}
      {status ? ` · ${status}` : ""}
    </Badge>
  );
}
