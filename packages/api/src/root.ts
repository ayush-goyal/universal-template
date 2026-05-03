import { aiRouter } from "./routes/ai";
import { commentsRouter } from "./routes/comments";
import createDevice from "./routes/createDevice";
import getCurrentUser from "./routes/getCurrentUser";
import getUserCount from "./routes/getUserCount";
import { labelsRouter } from "./routes/labels";
import { projectsRouter } from "./routes/projects";
import { remindersRouter } from "./routes/reminders";
import { searchRouter } from "./routes/search";
import { sectionsRouter } from "./routes/sections";
import { subscriptionRouter } from "./routes/subscription";
import { tasksRouter } from "./routes/tasks";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  // Legacy procedures
  getCurrentUser,
  getUserCount,
  createDevice,

  // Todoist domain
  projects: projectsRouter,
  sections: sectionsRouter,
  labels: labelsRouter,
  tasks: tasksRouter,
  comments: commentsRouter,
  reminders: remindersRouter,
  search: searchRouter,
  subscription: subscriptionRouter,
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;
