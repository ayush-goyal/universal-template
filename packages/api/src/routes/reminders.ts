import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@acme/db";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const remindersRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z
        .object({
          taskId: z.string().optional(),
          /** Limit to upcoming (un-sent) reminders. */
          upcoming: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return db.reminder.findMany({
        where: {
          userId: ctx.user.id,
          ...(input?.taskId ? { taskId: input.taskId } : {}),
          ...(input?.upcoming ? { sent: false } : {}),
          // Hide reminders attached to tasks in archived projects.
          // Mirrors tasks.list / search.query — archive should be a single
          // off-switch the user can flip across the whole product.
          task: {
            OR: [{ projectId: null }, { project: { isArchived: false } }],
          },
        },
        orderBy: { remindAt: "asc" },
        include: {
          task: {
            select: {
              id: true,
              title: true,
              completedAt: true,
              project: {
                select: { id: true, name: true, color: true, isInbox: true },
              },
            },
          },
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        remindAt: z.coerce.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const task = await db.task.findFirst({
        where: { id: input.taskId, userId: ctx.user.id },
        select: { id: true },
      });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      return db.reminder.create({
        data: {
          taskId: input.taskId,
          userId: ctx.user.id,
          remindAt: input.remindAt,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const reminder = await db.reminder.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!reminder) throw new TRPCError({ code: "NOT_FOUND" });
      await db.reminder.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
