import { db } from "@acme/db";

import { publicProcedure } from "../orpc";

const getUserCount = publicProcedure.handler(async () => {
  const count = await db.user.count();
  return count;
});

export default getUserCount;
