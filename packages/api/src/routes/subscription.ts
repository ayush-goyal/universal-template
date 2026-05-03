import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { auth, FREE_LIMITS, getUserPlan, PRO_LIMITS, PRO_PLAN_NAME } from "@acme/auth";
import { db } from "@acme/db";

import { createTRPCRouter, protectedProcedure } from "../trpc";

/**
 * Server-side wrappers around the Better Auth Stripe plugin endpoints.
 *
 * The plugin exposes REST endpoints (`/subscription/upgrade`,
 * `/subscription/billing-portal`, `/subscription/cancel`) which can be
 * invoked via `auth.api.*` server-side. We expose them through tRPC so the
 * client can stay in the typed tRPC layer.
 *
 * Stripe failures (e.g. dummy keys in dev) are converted into friendly
 * `BAD_REQUEST` errors that the UI surfaces as a toast.
 */
export const subscriptionRouter = createTRPCRouter({
  status: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const plan = await getUserPlan(userId);
    const sub = await db.subscription.findFirst({
      where: { referenceId: userId, plan: PRO_PLAN_NAME },
    });
    return {
      plan,
      limits: plan === "pro" ? PRO_LIMITS : FREE_LIMITS,
      currentPeriodEnd: sub?.periodEnd ?? null,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? null,
      status: sub?.status ?? null,
    };
  }),

  /**
   * Start a Stripe checkout for the Pro plan. Returns the `url` the client
   * should redirect to.
   */
  checkout: protectedProcedure
    .input(
      z.object({
        annual: z.boolean().optional(),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await auth.api.upgradeSubscription({
          headers: ctx.headers,
          body: {
            plan: PRO_PLAN_NAME,
            annual: input.annual,
            successUrl: input.successUrl,
            cancelUrl: input.cancelUrl,
            disableRedirect: true,
          },
        });
        const url = (result as { url?: string } | null)?.url;
        if (!url) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Stripe is not configured. Set STRIPE_SECRET_KEY to enable checkout.",
          });
        }
        return { url };
      } catch (err) {
        const message =
          err instanceof TRPCError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Could not start checkout";
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }
    }),

  /**
   * Open a Stripe billing portal session.
   */
  portal: protectedProcedure
    .input(z.object({ returnUrl: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await auth.api.createBillingPortal({
          headers: ctx.headers,
          body: { returnUrl: input.returnUrl, disableRedirect: true },
        });
        const url = (result as { url?: string } | null)?.url;
        if (!url) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Stripe is not configured.",
          });
        }
        return { url };
      } catch (err) {
        const message =
          err instanceof TRPCError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Could not open billing portal";
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }
    }),

  /**
   * Cancel the active Pro subscription (at period end).
   */
  cancel: protectedProcedure
    .input(z.object({ returnUrl: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await auth.api.cancelSubscription({
          headers: ctx.headers,
          body: { returnUrl: input.returnUrl, disableRedirect: true },
        });
        const url = (result as { url?: string } | null)?.url;
        return { url: url ?? null };
      } catch (err) {
        const message =
          err instanceof TRPCError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Could not cancel subscription";
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }
    }),

  /**
   * Resume a subscription that was scheduled to cancel at period end.
   */
  restore: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      await auth.api.restoreSubscription({
        headers: ctx.headers,
        body: {},
      });
      return { success: true };
    } catch (err) {
      const message =
        err instanceof TRPCError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not restore subscription";
      throw new TRPCError({ code: "BAD_REQUEST", message });
    }
  }),
});
