---
name: billing
description: Work on plans, subscriptions and paid features across this monorepo — the free/pro catalog in @acme/shared, entitlement resolution and usage metering in @acme/billing, Better Auth's Stripe plugin on the web, and RevenueCat on mobile. Use when adding or changing a plan, gating a feature behind Pro, enforcing a free-tier limit, touching a Stripe or RevenueCat webhook, or debugging why a user who paid still looks free.
paths:
  - "packages/billing/**"
  - "packages/shared/src/plans.ts"
  - "packages/shared/src/entitlement.ts"
  - "packages/auth/src/stripe.ts"
  - "apps/web/components/billing/**"
  - "apps/web/app/pricing/**"
  - "apps/web/app/dashboard/billing/**"
  - "apps/web/app/api/webhooks/**"
  - "apps/native/app/contexts/RevenueCatContext.tsx"
  - "apps/native/app/hooks/useEntitlement.ts"
  - "apps/native/app/libs/revenueCat.ts"
---

# Billing: free and pro across web and mobile

One user can pay through Stripe on the web or through the App Store / Play Store on mobile, and
every part of the product has to give the same answer to "is this person on Pro?". That answer is an
**entitlement**, and it is the only thing feature code should look at.

```
packages/shared/src/plans.ts        the catalog: what Free and Pro are. No dependencies.
packages/shared/src/entitlement.ts  the Entitlement shape every client receives.
packages/billing/                   server-only: resolve entitlements, meter usage, take webhooks.
packages/auth/src/index.ts          Better Auth's Stripe plugin, fed from the catalog.
packages/api/src/trpc.ts            ctx.getEntitlement(), proProcedure.
```

`@acme/shared` is bundled into the React Native app. Keep it free of Node-only imports or the Metro
build breaks.

## Adding or changing a plan

1. Add an entry to `PLANS` in `packages/shared/src/plans.ts`. Give it a `rank` above the plan it
   supersedes — `rank` is what every comparison uses, so ordering is the only thing that matters.
2. Add any new key to `PlanLimits` and **enforce it somewhere**. A limit nothing checks is marketing
   copy. Per-day counters go through `consumeUsage`; totals are counted at the point of use, as
   `routes/createDevice.ts` does.
3. Create the Stripe prices and put their IDs in the environment (`env-vars` skill covers the
   checklist). `getStripePlans()` skips any plan with no configured price, so an unpriced plan is
   simply not for sale rather than a checkout that 500s.
4. Create the matching RevenueCat entitlement in their dashboard and set `revenueCatEntitlement` to
   its exact identifier. The comparison is case-sensitive.

The pricing page, the mobile settings screen and the Stripe plugin all read the catalog, so nothing
else needs editing to sell a new plan.

## Gating a feature

**Server, all-or-nothing:** use `proProcedure` (or `planProcedure("pro")`) from `../trpc`. It throws
`FORBIDDEN` before the handler runs.

**Server, metered:** call `consumeUsage(userId, feature, entitlement)` _before_ doing the work and
turn `UsageLimitExceededError` into a `TRPCError`. `routes/chat.ts` is the working example. The
increment and the check are one atomic write, so two concurrent requests cannot both spend the last
unit.

**Server, conditional:** `await ctx.getEntitlement()` and branch on `.isPro` or `.limits`. It is
memoised per request, so calling it repeatedly is free.

**Web:** `useEntitlement()` from `@/hooks/use-billing`.

**Mobile:** `useEntitlement()` from `@/hooks/useEntitlement`. It merges the server's answer with the
local RevenueCat SDK, which is deliberate — see below.

Client-side gating is presentation. Anything that costs money or exposes data must also be gated on
the server; the client copy is what stops the user seeing a paywall they already paid for.

## Why mobile trusts two sources

The server is the authority: it is what actually gates the API. But its view of a store purchase only
updates when RevenueCat's webhook arrives, which can take up to a minute. In that window the SDK on
the device already knows the purchase succeeded. `useEntitlement` unlocks the UI if _either_ says
Pro, so a user who has just paid is not shown the paywall again.

`RevenueCatContext` calls `Purchases.logIn(user.id)` with the Better Auth user id. That id is what
arrives as `app_user_id` on the webhook, and it is the only link between a store purchase and an
account — if it is wrong, purchases land on an anonymous customer and never reach the database.

## Webhooks

| Provider   | Route                                   | Verified with                                      |
| ---------- | --------------------------------------- | -------------------------------------------------- |
| Stripe     | `/api/auth/stripe/webhook` (the plugin) | `STRIPE_WEBHOOK_SECRET`                            |
| RevenueCat | `/api/webhooks/revenuecat`              | `REVENUECAT_WEBHOOK_SIGNING_SECRET` or auth header |

Both are unauthenticated endpoints that grant paid access, so both verify before doing anything.
`isRevenueCatConfigured()` returning false makes the RevenueCat route reject every request rather
than accept unsigned ones — failing closed is the only safe direction here.

RevenueCat events are deduplicated through the `WebhookEvent` table, because they retry and can
arrive out of order. When `REVENUECAT_SECRET_API_KEY` is set the handler re-reads the subscriber from
their API rather than trusting the event body, which is what makes out-of-order delivery harmless.

Point Stripe at the local app with `stripe listen --forward-to localhost:3000/api/auth/stripe/webhook`
and RevenueCat with any HTTPS tunnel.

## Debugging "I paid but I'm still on Free"

Work down this list; it is roughly ordered by how often each one is the answer.

1. Did the webhook arrive? `select * from "WebhookEvent" order by "createdAt" desc limit 5;` for
   RevenueCat, the Stripe dashboard's event log for Stripe.
2. Is the row there? `Subscription` for Stripe, `MobileSubscription` for RevenueCat.
3. Does `Subscription.plan` match a catalog plan id? The plugin lower-cases the plan name before
   storing it, which is why `getStripePlans()` emits lower-case names.
4. Does `MobileSubscription.entitlement` match `PLANS.pro.revenueCatEntitlement` exactly?
5. Is the client cache stale? `refreshBilling()` on web, `refresh()` from `useEntitlement` on mobile.

## Gotchas

- Everything boots with billing switched off — that is a requirement of the template, not an
  accident. Do not add a startup assertion; use `isStripeConfigured()` / `isRevenueCatConfigured()`
  at the point of use.
- Statuses collapse to `EntitlementStatus`, and `past_due` **keeps** access. The payment retry
  window is deliberately forgiving; changing that is a product decision, not a bug fix.
- An App Store subscription cannot be cancelled from a Stripe billing portal. Check
  `isManageableOnWeb(entitlement)` before offering one — on iOS, getting this wrong is an App Review
  rejection.
- Usage windows are UTC days (`usagePeriodStart`), not the user's local day.
- Money is in minor units everywhere. Format with `formatPrice`, never by dividing in a component.
- `@acme/billing` imports `@acme/db` and must never be imported from `apps/native`.
