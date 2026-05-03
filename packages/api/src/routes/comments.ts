import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@acme/db";

import { createTRPCRouter, protectedProcedure } from "../trpc";

async function assertTask(userId: string, taskId: string) {
  const task = await db.task.findFirst({
    where: { id: taskId, userId },
    select: { id: true },
  });
  if (!task) throw new TRPCError({ code: "NOT_FOUND" });
}

export const commentsRouter = createTRPCRouter({
  list: protectedProcedure.input(z.object({ taskId: z.string() })).query(async ({ ctx, input }) => {
    await assertTask(ctx.user.id, input.taskId);
    return db.comment.findMany({
      where: { taskId: input.taskId },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, name: true, image: true } } },
    });
  }),

  create: protectedProcedure
    .input(z.object({ taskId: z.string(), content: z.string().min(1).max(20000) }))
    .mutation(async ({ ctx, input }) => {
      await assertTask(ctx.user.id, input.taskId);
      return db.comment.create({
        data: {
          taskId: input.taskId,
          userId: ctx.user.id,
          content: input.content,
        },
        include: { user: { select: { id: true, name: true, image: true } } },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const comment = await db.comment.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!comment) throw new TRPCError({ code: "NOT_FOUND" });
      await db.comment.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
