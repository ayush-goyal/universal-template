import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { db, DevicePlatform } from "@acme/db";

import { protectedProcedure } from "../orpc";

const CreateDeviceInputSchema = z.object({
  fcmToken: z.string(),
  platform: z.nativeEnum(DevicePlatform),
});

export default protectedProcedure
  .input(CreateDeviceInputSchema)
  .handler(async ({ context, input }) => {
    const numberOfExistingDevices = await db.device.count({
      where: {
        userId: context.user.id,
      },
    });
    if (numberOfExistingDevices > 10) {
      throw new ORPCError("BAD_REQUEST", {
        message: "You have too many devices.",
      });
    }

    const device = await db.device.upsert({
      where: {
        userId_fcmToken: {
          userId: context.user.id,
          fcmToken: input.fcmToken,
        },
      },
      create: {
        userId: context.user.id,
        fcmToken: input.fcmToken,
        platform: input.platform,
      },
      update: {},
    });
    return device;
  });
