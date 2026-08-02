import { publicProcedure } from "../trpc";

/**
 * What the caller is allowed to do, resolved across Stripe and RevenueCat.
 *
 * Public rather than protected: signed-out visitors on the pricing page need an answer too, and for
 * them it is simply the free plan. Clients treat this as the source of truth for gating, including
 * the mobile app, whose local RevenueCat cache can disagree after a purchase on another device.
 */
export default publicProcedure.query(({ ctx }) => ctx.getEntitlement());
