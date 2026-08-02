"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/react";

/**
 * The caller's entitlement, resolved server-side across Stripe and RevenueCat.
 *
 * Always prefer this over reading a Stripe subscription directly: a user who bought Pro in the iOS
 * app has no Stripe subscription at all, and the web UI still has to show them as Pro.
 */
export function useEntitlement() {
  const trpc = useTRPC();
  return useQuery(trpc.getEntitlement.queryOptions());
}

/** Today's metered usage. Only meaningful when signed in, so it does not run otherwise. */
export function useUsage() {
  const trpc = useTRPC();
  const { data: session } = authClient.useSession();
  return useQuery({ ...trpc.getUsage.queryOptions(), enabled: Boolean(session) });
}

/**
 * The user's active Stripe subscription, straight from Better Auth.
 *
 * Needed on top of the entitlement because changing or cancelling a plan requires the Stripe
 * subscription id — without it, `subscription.upgrade` opens a *second* subscription and bills the
 * user twice.
 */
export function useStripeSubscription() {
  const { data: session } = authClient.useSession();

  return useQuery({
    queryKey: ["billing", "stripe-subscription", session?.user.id ?? null],
    enabled: Boolean(session),
    queryFn: async () => {
      const { data, error } = await authClient.subscription.list();
      if (error) throw new Error(error.message ?? "Could not load your subscription.");
      return (
        data?.find(
          (subscription) =>
            subscription.status === "active" ||
            subscription.status === "trialing" ||
            subscription.status === "past_due"
        ) ?? null
      );
    },
  });
}

/**
 * Refetch everything billing-related.
 *
 * Stripe's webhook and the browser's redirect back from Checkout race each other, and a RevenueCat
 * purchase reaches the server only via its webhook, so the UI has to be told to look again.
 */
export function useRefreshBilling() {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: trpc.getEntitlement.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpc.getUsage.queryKey() }),
      queryClient.invalidateQueries({ queryKey: ["billing"] }),
    ]);
  };
}
