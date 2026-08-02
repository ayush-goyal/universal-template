import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db, DevicePlatform } from "@acme/db";

import { protectedProcedure } from "../trpc";

const CreateDeviceInputSchema = z.object({
  fcmToken: z.string(),
  platform: z.enum(DevicePlatform),
});

export default protectedProcedure
  .input(CreateDeviceInputSchema)
  .mutation(async ({ ctx, input }) => {
    const { limits } = await ctx.getEntitlement();

    // Re-registering a device the user already has must not be rejected for being over the limit,
    // so only count this against the quota when it is genuinely a new device.
    const existing = await db.device.findUnique({
      where: { userId_fcmToken: { userId: ctx.user.id, fcmToken: input.fcmToken } },
    });

    if (!existing) {
      const registeredDevices = await db.device.count({ where: { userId: ctx.user.id } });
      if (registeredDevices >= limits.devices) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Your plan allows ${limits.devices} device${limits.devices === 1 ? "" : "s"}. Upgrade to Pro to register more.`,
        });
      }
    }

    const device = await db.device.upsert({
      where: {
        userId_fcmToken: {
          userId: ctx.user.id,
          fcmToken: input.fcmToken,
        },
      },
      create: {
        userId: ctx.user.id,
        fcmToken: input.fcmToken,
        platform: input.platform,
      },
      update: {},
    });
    return device;
  });
