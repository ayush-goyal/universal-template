import { TRPCError } from "@trpc/server";
import { DateTime } from "luxon";
import { z } from "zod";

import { FREE_LIMITS, getUserPlan } from "@acme/auth";
import { db } from "@acme/db";

import { ensureInbox } from "../lib/inbox";
import { nextOccurrence, parseRecurrence } from "../lib/recurrence";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const PrioritySchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);

const SmartFilterSchema = z.enum(["inbox", "today", "upcoming", "completed", "all"]);

const ListInputSchema = z
  .object({
    projectId: z.string().optional(),
    sectionId: z.string().optional(),
    labelId: z.string().optional(),
    smart: SmartFilterSchema.optional(),
    search: z.string().optional(),
    includeCompleted: z.boolean().optional(),
    /**
     * If true (the default for project filters), only top-level tasks are
     * returned and their immediate children are nested via `children`.
     * Smart views set this false so subtasks show up as standalone rows.
     */
    nested: z.boolean().optional(),
  })
  .default({});

async function assertTask(userId: string, taskId: string) {
  const task = await db.task.findFirst({
    where: { id: taskId, userId },
  });
  if (!task) throw new TRPCError({ code: "NOT_FOUND" });
  return task;
}

const TASK_INCLUDE = {
  taskLabels: { include: { label: true } },
  _count: { select: { comments: true, children: true, reminders: true } },
} as const;

export const tasksRouter = createTRPCRouter({
  list: protectedProcedure.input(ListInputSchema).query(async ({ ctx, input }) => {
    const userId = ctx.user.id;
    const where: Parameters<typeof db.task.findMany>[0] extends infer T
      ? T extends { where?: infer W }
        ? W
        : never
      : never = { userId };
    const w = where as Record<string, unknown>;

    if (input.smart === "completed" || input.includeCompleted) {
      // include all
    } else {
      w.completedAt = null;
    }

    if (input.projectId) {
      w.projectId = input.projectId;
    }
    if (input.sectionId) {
      w.sectionId = input.sectionId;
    }
    if (input.labelId) {
      w.taskLabels = { some: { labelId: input.labelId } };
    }

    if (input.smart === "inbox") {
      const inbox = await ensureInbox(userId);
      w.projectId = inbox.id;
    }
    if (input.smart === "today") {
      // Anything due today OR overdue (still incomplete).
      const end = DateTime.now().endOf("day").toJSDate();
      w.dueAt = { lte: end };
    }
    if (input.smart === "upcoming") {
      const start = DateTime.now().startOf("day").toJSDate();
      const end = DateTime.now().plus({ days: 7 }).endOf("day").toJSDate();
      w.dueAt = { gte: start, lte: end };
    }
    if (input.smart === "completed") {
      w.completedAt = { not: null };
    }
    if (input.search) {
      w.OR = [
        { title: { contains: input.search, mode: "insensitive" } },
        { description: { contains: input.search, mode: "insensitive" } },
      ];
    }

    // Nested mode: only return top-level tasks and inline their children.
    // Default to nested for inbox / project / section filters; flat for
    // Today / Upcoming / Completed / Search / Label so that subtasks show
    // up as standalone rows alongside their context.
    const nested =
      input.nested ??
      (input.smart === "inbox" || input.projectId !== undefined || input.sectionId !== undefined);

    if (nested) {
      w.parentTaskId = null;
      return db.task.findMany({
        where: w,
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        include: {
          ...TASK_INCLUDE,
          children: {
            where:
              input.smart === "completed" || input.includeCompleted ? {} : { completedAt: null },
            orderBy: [{ order: "asc" }, { createdAt: "asc" }],
            include: TASK_INCLUDE,
          },
        },
      });
    }

    return db.task.findMany({
      where: w,
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      include: TASK_INCLUDE,
    });
  }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const task = await db.task.findFirst({
      where: { id: input.id, userId: ctx.user.id },
      include: {
        ...TASK_INCLUDE,
        comments: { orderBy: { createdAt: "asc" }, include: { user: true } },
        reminders: { orderBy: { remindAt: "asc" } },
        children: {
          where: { completedAt: null },
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          include: TASK_INCLUDE,
        },
      },
    });
    if (!task) throw new TRPCError({ code: "NOT_FOUND" });
    return task;
  }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(500),
        description: z.string().max(20000).optional(),
        projectId: z.string().nullish(),
        sectionId: z.string().nullish(),
        parentTaskId: z.string().nullish(),
        priority: PrioritySchema.optional(),
        dueAt: z.coerce.date().nullish(),
        dueHasTime: z.boolean().optional(),
        recurrence: z.string().nullish(),
        labelIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Resolve project: default to inbox.
      let projectId = input.projectId ?? null;
      if (!projectId && !input.parentTaskId) {
        const inbox = await ensureInbox(userId);
        projectId = inbox.id;
      } else if (input.parentTaskId) {
        const parent = await assertTask(userId, input.parentTaskId);
        projectId = parent.projectId;
      } else if (projectId) {
        const project = await db.project.findFirst({
          where: { id: projectId, userId },
        });
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      // Free-tier per-project limit.
      if (projectId) {
        const plan = await getUserPlan(userId);
        if (plan === "free") {
          const count = await db.task.count({
            where: { userId, projectId, completedAt: null },
          });
          if (count >= FREE_LIMITS.tasksPerProject) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `Free plan is limited to ${FREE_LIMITS.tasksPerProject} active tasks per project. Upgrade to Pro for unlimited tasks.`,
            });
          }
        }
      }

      if (input.recurrence && !parseRecurrence(input.recurrence)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Could not parse recurrence: "${input.recurrence}"`,
        });
      }

      if (input.labelIds?.length) {
        const labels = await db.label.findMany({
          where: { id: { in: input.labelIds }, userId },
          select: { id: true },
        });
        if (labels.length !== input.labelIds.length) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid label" });
        }
      }

      const last = await db.task.findFirst({
        where: { userId, projectId, sectionId: input.sectionId ?? null },
        orderBy: { order: "desc" },
        select: { order: true },
      });

      return db.task.create({
        data: {
          userId,
          title: input.title,
          description: input.description ?? null,
          projectId,
          sectionId: input.sectionId ?? null,
          parentTaskId: input.parentTaskId ?? null,
          priority: input.priority ?? 4,
          dueAt: input.dueAt ?? null,
          dueHasTime: input.dueHasTime ?? false,
          recurrence: input.recurrence ?? null,
          order: (last?.order ?? 0) + 1,
          taskLabels: input.labelIds?.length
            ? {
                create: input.labelIds.map((labelId) => ({ labelId })),
              }
            : undefined,
        },
        include: TASK_INCLUDE,
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(500).optional(),
        description: z.string().max(20000).nullish(),
        projectId: z.string().nullish(),
        sectionId: z.string().nullish(),
        parentTaskId: z.string().nullish(),
        priority: PrioritySchema.optional(),
        dueAt: z.coerce.date().nullish(),
        dueHasTime: z.boolean().optional(),
        recurrence: z.string().nullish(),
        labelIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      await assertTask(userId, input.id);

      if (input.recurrence && !parseRecurrence(input.recurrence)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Could not parse recurrence: "${input.recurrence}"`,
        });
      }
      if (input.projectId) {
        const project = await db.project.findFirst({
          where: { id: input.projectId, userId },
        });
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      const { id, labelIds, ...rest } = input;

      return db.$transaction(async (tx) => {
        await tx.task.update({
          where: { id },
          data: rest,
        });
        if (labelIds) {
          await tx.taskLabel.deleteMany({ where: { taskId: id } });
          if (labelIds.length) {
            await tx.taskLabel.createMany({
              data: labelIds.map((labelId) => ({ taskId: id, labelId })),
              skipDuplicates: true,
            });
          }
        }
        return tx.task.findUniqueOrThrow({ where: { id }, include: TASK_INCLUDE });
      });
    }),

  complete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const task = await assertTask(ctx.user.id, input.id);
      const now = new Date();

      // Recurring task → mark completed AND create next occurrence.
      if (task.recurrence) {
        const nextDue = nextOccurrence(task.recurrence, task.dueAt ?? now);
        return db.$transaction(async (tx) => {
          await tx.task.update({
            where: { id: task.id },
            data: { completedAt: now, recurrence: null },
          });
          const labels = await tx.taskLabel.findMany({
            where: { taskId: task.id },
            select: { labelId: true },
          });
          return tx.task.create({
            data: {
              userId: task.userId,
              title: task.title,
              description: task.description,
              projectId: task.projectId,
              sectionId: task.sectionId,
              parentTaskId: task.parentTaskId,
              priority: task.priority,
              dueAt: nextDue,
              dueHasTime: task.dueHasTime,
              recurrence: task.recurrence,
              order: task.order,
              taskLabels: labels.length
                ? { create: labels.map((l) => ({ labelId: l.labelId })) }
                : undefined,
            },
            include: TASK_INCLUDE,
          });
        });
      }

      return db.task.update({
        where: { id: task.id },
        data: { completedAt: now },
        include: TASK_INCLUDE,
      });
    }),

  uncomplete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertTask(ctx.user.id, input.id);
      return db.task.update({
        where: { id: input.id },
        data: { completedAt: null },
        include: TASK_INCLUDE,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertTask(ctx.user.id, input.id);
      await db.task.delete({ where: { id: input.id } });
      return { success: true };
    }),

  reorder: protectedProcedure
    .input(
      z.object({
        orderedIds: z.array(z.string()),
        projectId: z.string().nullish(),
        sectionId: z.string().nullish(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tasks = await db.task.findMany({
        where: { id: { in: input.orderedIds }, userId: ctx.user.id },
        select: { id: true },
      });
      if (tasks.length !== input.orderedIds.length) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await db.$transaction(
        input.orderedIds.map((id, idx) =>
          db.task.update({
            where: { id },
            data: {
              order: idx + 1,
              ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
              ...(input.sectionId !== undefined ? { sectionId: input.sectionId } : {}),
            },
          })
        )
      );
      return { success: true };
    }),

  move: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        projectId: z.string().nullish(),
        sectionId: z.string().nullish(),
        parentTaskId: z.string().nullish(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertTask(ctx.user.id, input.id);
      if (input.projectId) {
        const project = await db.project.findFirst({
          where: { id: input.projectId, userId: ctx.user.id },
        });
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      }
      const { id, ...rest } = input;
      return db.task.update({
        where: { id },
        data: rest,
        include: TASK_INCLUDE,
      });
    }),
});
