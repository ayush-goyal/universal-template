import { getUsage } from "@acme/billing";

import { protectedProcedure } from "../trpc";

/**
 * Today's consumption of the metered plan limits, for the "3 messages left" style UI.
 *
 * Advisory only — `chat` enforces the same limit at the point of use, so a stale client cannot
 * spend more than its allowance.
 */
export default protectedProcedure.query(async ({ ctx }) => {
  const entitlement = await ctx.getEntitlement();

  return {
    aiMessages: await getUsage(ctx.user.id, "aiMessagesPerDay", entitlement),
  };
});
