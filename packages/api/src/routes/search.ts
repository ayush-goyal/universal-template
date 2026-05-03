import { z } from "zod";

import { db } from "@acme/db";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const searchRouter = createTRPCRouter({
  query: protectedProcedure
    .input(z.object({ q: z.string().min(1).max(200) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const q = input.q;

      const [tasks, projects, labels] = await Promise.all([
        db.task.findMany({
          where: {
            userId,
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 30,
          orderBy: [{ completedAt: "asc" }, { dueAt: "asc" }],
          include: {
            project: { select: { id: true, name: true, color: true, isInbox: true } },
            taskLabels: { include: { label: true } },
          },
        }),
        db.project.findMany({
          where: {
            userId,
            isArchived: false,
            name: { contains: q, mode: "insensitive" },
          },
          take: 10,
        }),
        db.label.findMany({
          where: { userId, name: { contains: q, mode: "insensitive" } },
          take: 10,
        }),
      ]);

      return { tasks, projects, labels };
    }),
});
