import chat from "./routes/chat";
import createDevice from "./routes/createDevice";
import getCurrentUser from "./routes/getCurrentUser";
import getEntitlement from "./routes/getEntitlement";
import getUsage from "./routes/getUsage";
import getUserCount from "./routes/getUserCount";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  chat,
  getCurrentUser,
  getEntitlement,
  getUsage,
  getUserCount,
  createDevice,
});

export type AppRouter = typeof appRouter;
