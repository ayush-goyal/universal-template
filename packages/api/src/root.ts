import createDevice from "./routes/createDevice";
import getCurrentUser from "./routes/getCurrentUser";
import getUserCount from "./routes/getUserCount";

export const appRouter = {
  getCurrentUser,
  getUserCount,
  createDevice,
};

export type AppRouter = typeof appRouter;
