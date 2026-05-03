import { db } from "@acme/db";

import { protectedProcedure } from "../orpc";

const getCurrentUser = protectedProcedure.handler(async ({ context }) => {
  const user = await db.user.findUnique({
    where: {
      id: context.user.id,
    },
  });

  return user;
});

export default getCurrentUser;
