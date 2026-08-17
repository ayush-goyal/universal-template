import { db } from "@acme/db";
import { PRO_ENTITLEMENT, PRO_PLAN } from "@acme/shared/billing";

export function resolveProBackendAccess(input: {
  hasStripeAccess: boolean;
  revenueCatEntitlement: {
    isActive: boolean;
  } | null;
}) {
  const hasRevenueCatAccess = Boolean(input.revenueCatEntitlement?.isActive);
  const sources = [
    ...(input.hasStripeAccess ? (["stripe"] as const) : []),
    ...(hasRevenueCatAccess ? (["revenuecat"] as const) : []),
  ];

  return {
    isPro: sources.length > 0,
    sources,
  };
}

export async function getProBackendAccess(userId: string) {
  const [stripeSubscription, revenueCatEntitlement] = await Promise.all([
    db.subscription.findFirst({
      where: {
        referenceId: userId,
        plan: PRO_PLAN,
        status: {
          in: ["active", "past_due", "trialing"],
        },
      },
      select: {
        id: true,
      },
    }),
    db.revenueCatEntitlement.findUnique({
      where: {
        userId_entitlementId: {
          userId,
          entitlementId: PRO_ENTITLEMENT,
        },
      },
    }),
  ]);

  return resolveProBackendAccess({
    hasStripeAccess: Boolean(stripeSubscription),
    revenueCatEntitlement,
  });
}
