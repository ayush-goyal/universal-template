import chat from "./routes/chat";
import createDevice from "./routes/createDevice";
import getCurrentUser from "./routes/getCurrentUser";
import getStripeBillingStatus from "./routes/getStripeBillingStatus";
import getUserCount from "./routes/getUserCount";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  chat,
  getCurrentUser,
  getStripeBillingStatus,
  getUserCount,
  createDevice,
});

export type AppRouter = typeof appRouter;
