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
    const numberOfExistingDevices = await db.device.count({
      where: {
        userId: ctx.user.id,
      },
    });
    if (numberOfExistingDevices > 10) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You have too many devices.",
      });
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
