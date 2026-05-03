import createDevice from "./routes/createDevice";
import getAiDemoContext from "./routes/getAiDemoContext";
import getCurrentUser from "./routes/getCurrentUser";
import getUserCount from "./routes/getUserCount";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  getCurrentUser,
  getUserCount,
  getAiDemoContext,
  createDevice,
});

export type AppRouter = typeof appRouter;
