import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@acme/db";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const remindersRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ taskId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return db.reminder.findMany({
        where: {
          userId: ctx.user.id,
          ...(input?.taskId ? { taskId: input.taskId } : {}),
        },
        orderBy: { remindAt: "asc" },
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
