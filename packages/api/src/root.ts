import createDevice from "./routes/createDevice";
import getCurrentUser from "./routes/getCurrentUser";
import getSubscription from "./routes/getSubscription";
import getUserCount from "./routes/getUserCount";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  getCurrentUser,
  getUserCount,
  createDevice,
  getSubscription,
});

export type AppRouter = typeof appRouter;
