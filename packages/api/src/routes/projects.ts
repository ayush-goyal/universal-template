import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { FREE_LIMITS, getUserPlan } from "@acme/auth";
import { db, ProjectView } from "@acme/db";

import { COLORS } from "../lib/colors";
import { ensureInbox } from "../lib/inbox";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const ColorSchema = z.enum(COLORS);
const ViewSchema = z.nativeEnum(ProjectView);

export const projectsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ archived: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      await ensureInbox(ctx.user.id);
      return db.project.findMany({
        where: {
          userId: ctx.user.id,
          isArchived: input?.archived ?? false,
        },
        orderBy: [{ isInbox: "desc" }, { order: "asc" }, { createdAt: "asc" }],
        include: { sections: { orderBy: { order: "asc" } } },
      });
    }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const project = await db.project.findFirst({
      where: { id: input.id, userId: ctx.user.id },
      include: { sections: { orderBy: { order: "asc" } } },
    });
    if (!project) throw new TRPCError({ code: "NOT_FOUND" });
    return project;
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(120),
        color: ColorSchema.optional(),
        viewType: ViewSchema.optional(),
        parentId: z.string().nullish(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const plan = await getUserPlan(ctx.user.id);
      if (plan === "free") {
        const count = await db.project.count({
          where: { userId: ctx.user.id, isArchived: false, isInbox: false },
        });
        if (count >= FREE_LIMITS.projects) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Free plan is limited to ${FREE_LIMITS.projects} projects. Upgrade to Pro for unlimited projects.`,
          });
        }
      }

      const last = await db.project.findFirst({
        where: { userId: ctx.user.id },
        orderBy: { order: "desc" },
        select: { order: true },
      });

      return db.project.create({
        data: {
          userId: ctx.user.id,
          name: input.name,
          color: input.color ?? "sage",
          viewType: input.viewType ?? "LIST",
          parentId: input.parentId ?? null,
          order: (last?.order ?? 0) + 1,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(120).optional(),
        color: ColorSchema.optional(),
        viewType: ViewSchema.optional(),
        isFavorite: z.boolean().optional(),
        isArchived: z.boolean().optional(),
        parentId: z.string().nullish(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await db.project.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      if (project.isInbox && (input.name || input.isArchived)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Inbox cannot be renamed or archived",
        });
      }
      const { id, ...rest } = input;
      return db.project.update({ where: { id }, data: rest });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await db.project.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      if (project.isInbox) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Inbox cannot be deleted" });
      }
      await db.project.delete({ where: { id: input.id } });
      return { success: true };
    }),

  reorder: protectedProcedure
    .input(z.object({ orderedIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      // Verify all belong to user.
      const projects = await db.project.findMany({
        where: { id: { in: input.orderedIds }, userId: ctx.user.id },
        select: { id: true },
      });
      if (projects.length !== input.orderedIds.length) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await db.$transaction(
        input.orderedIds.map((id, idx) =>
          db.project.update({ where: { id }, data: { order: idx + 1 } })
        )
      );
      return { success: true };
    }),
});
