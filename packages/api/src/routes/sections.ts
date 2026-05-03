import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@acme/db";

import { createTRPCRouter, protectedProcedure } from "../trpc";

async function assertProject(userId: string, projectId: string) {
  const project = await db.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  });
  if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  return project;
}

async function assertSection(userId: string, sectionId: string) {
  const section = await db.section.findFirst({
    where: { id: sectionId, project: { userId } },
  });
  if (!section) throw new TRPCError({ code: "NOT_FOUND" });
  return section;
}

export const sectionsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertProject(ctx.user.id, input.projectId);
      return db.section.findMany({
        where: { projectId: input.projectId },
        orderBy: { order: "asc" },
      });
    }),

  create: protectedProcedure
    .input(z.object({ projectId: z.string(), name: z.string().min(1).max(120) }))
    .mutation(async ({ ctx, input }) => {
      await assertProject(ctx.user.id, input.projectId);
      const last = await db.section.findFirst({
        where: { projectId: input.projectId },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      return db.section.create({
        data: {
          projectId: input.projectId,
          name: input.name,
          order: (last?.order ?? 0) + 1,
        },
      });
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1).max(120) }))
    .mutation(async ({ ctx, input }) => {
      await assertSection(ctx.user.id, input.id);
      return db.section.update({
        where: { id: input.id },
        data: { name: input.name },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertSection(ctx.user.id, input.id);
      await db.section.delete({ where: { id: input.id } });
      return { success: true };
    }),

  reorder: protectedProcedure
    .input(z.object({ projectId: z.string(), orderedIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      await assertProject(ctx.user.id, input.projectId);
      const sections = await db.section.findMany({
        where: { id: { in: input.orderedIds }, projectId: input.projectId },
        select: { id: true },
      });
      if (sections.length !== input.orderedIds.length) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await db.$transaction(
        input.orderedIds.map((id, idx) =>
          db.section.update({ where: { id }, data: { order: idx + 1 } })
        )
      );
      return { success: true };
    }),
});
