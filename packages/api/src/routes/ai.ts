import { createOpenAI } from "@ai-sdk/openai";
import { TRPCError } from "@trpc/server";
import { generateObject, generateText } from "ai";
import { DateTime } from "luxon";
import { z } from "zod";

import { getUserPlan } from "@acme/auth";
import { db } from "@acme/db";

import { parseQuickAdd } from "../lib/quickAdd";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

function getModel() {
  if (!process.env.OPENAI_API_KEY) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "AI not configured. Set OPENAI_API_KEY to enable AI features.",
    });
  }
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai(MODEL);
}

async function assertPro(userId: string) {
  const plan = await getUserPlan(userId);
  if (plan !== "pro") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "AI features are part of Acme Tasks Pro. Upgrade to enable them.",
    });
  }
}

const QuickAddSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  dueAt: z.string().datetime().optional(),
  dueHasTime: z.boolean().optional(),
  recurrence: z.string().optional(),
  projectName: z.string().optional(),
  labelNames: z.array(z.string()).optional(),
});

const ProjectPlanSchema = z.object({
  projectName: z.string(),
  description: z.string().optional(),
  tasks: z.array(
    z.object({
      title: z.string(),
      description: z.string().optional(),
      priority: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
      dueInDays: z.number().int().min(0).max(365).optional(),
    })
  ),
});

export const aiRouter = createTRPCRouter({
  /**
   * Returns whether AI is enabled for this deployment.
   */
  status: protectedProcedure.query(async ({ ctx }) => {
    const plan = await getUserPlan(ctx.user.id);
    return {
      enabled: !!process.env.OPENAI_API_KEY,
      plan,
    };
  }),

  /**
   * Parses a quick-add string. Always falls back to the regex parser when
   * AI is disabled or the user is on free tier.
   */
  parseQuickAdd: protectedProcedure
    .input(z.object({ text: z.string().min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      const plan = await getUserPlan(ctx.user.id);
      const aiEnabled = !!process.env.OPENAI_API_KEY && plan === "pro";

      if (!aiEnabled) {
        const parsed = parseQuickAdd(input.text);
        return { ...parsed, source: "regex" as const };
      }

      const today = DateTime.now().toISO();
      try {
        const { object } = await generateObject({
          model: getModel(),
          schema: QuickAddSchema,
          prompt: [
            `Today is ${today}.`,
            `Convert the following user-entered task into a structured task.`,
            `Recognize Todoist-style markers: "#project", "@label", "p1"-"p4" priority, dates ("today", "tomorrow", "next monday"), times ("9am", "15:30"), and recurrence ("every day", "weekdays", "every monday", "every 1st").`,
            `Return ISO 8601 dueAt in the user's local time.`,
            `Input: ${JSON.stringify(input.text)}`,
          ].join("\n"),
        });
        return { ...object, source: "ai" as const };
      } catch {
        const parsed = parseQuickAdd(input.text);
        return { ...parsed, source: "regex" as const };
      }
    }),

  /**
   * Suggests an order/grouping for today's open tasks.
   */
  planMyDay: protectedProcedure.mutation(async ({ ctx }) => {
    await assertPro(ctx.user.id);
    const today = DateTime.now();
    const tasks = await db.task.findMany({
      where: {
        userId: ctx.user.id,
        completedAt: null,
        // Skip archived projects — the AI shouldn't surface tasks from
        // them in any plan/summary.
        AND: [
          {
            OR: [{ projectId: null }, { project: { isArchived: false } }],
          },
        ],
        OR: [
          { dueAt: { lte: today.endOf("day").toJSDate() } },
          { dueAt: null, priority: { lte: 3 } },
        ],
      },
      orderBy: [{ priority: "asc" }, { dueAt: "asc" }],
      take: 30,
      include: { project: true },
    });

    if (tasks.length === 0) {
      return { plan: "You have nothing to do today. Take a breath." };
    }

    const { text } = await generateText({
      model: getModel(),
      prompt: [
        `You are a calm productivity coach. Build a focused plan for today.`,
        `Group tasks into "Morning", "Afternoon", "Evening" buckets.`,
        `Use 1-2 sentences per task to motivate. Keep it short and warm.`,
        `Return Markdown.`,
        `Tasks:`,
        ...tasks.map(
          (t, i) =>
            `${i + 1}. ${t.title} ${t.dueAt ? `(due ${DateTime.fromJSDate(t.dueAt).toRelative()})` : ""} [P${t.priority}] ${t.project ? `#${t.project.name}` : ""}`
        ),
      ].join("\n"),
    });

    return { plan: text };
  }),

  /**
   * Generates a project skeleton (name + tasks) from a goal.
   */
  generateProject: protectedProcedure
    .input(z.object({ goal: z.string().min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      await assertPro(ctx.user.id);
      const { object } = await generateObject({
        model: getModel(),
        schema: ProjectPlanSchema,
        prompt: [
          `Build a Todoist project plan for the goal below.`,
          `Return a project name and 5-12 tasks. Use priority 1-4 (1 = highest).`,
          `dueInDays should be relative offsets from today.`,
          `Goal: ${JSON.stringify(input.goal)}`,
        ].join("\n"),
      });
      return object;
    }),

  /**
   * Daily summary of today's progress.
   */
  dailySummary: protectedProcedure.mutation(async ({ ctx }) => {
    await assertPro(ctx.user.id);
    const start = DateTime.now().startOf("day").toJSDate();
    const end = DateTime.now().endOf("day").toJSDate();
    const [completed, remaining] = await Promise.all([
      db.task.findMany({
        where: {
          userId: ctx.user.id,
          completedAt: { gte: start, lte: end },
          // Skip archived projects.
          OR: [{ projectId: null }, { project: { isArchived: false } }],
        },
      }),
      db.task.findMany({
        where: {
          userId: ctx.user.id,
          completedAt: null,
          dueAt: { gte: start, lte: end },
          // Skip archived projects.
          OR: [{ projectId: null }, { project: { isArchived: false } }],
        },
      }),
    ]);
    const { text } = await generateText({
      model: getModel(),
      prompt: [
        `You are a friendly productivity coach. Write a 3-4 sentence end-of-day summary.`,
        `Completed today: ${completed.length}`,
        completed.map((t) => `- ${t.title}`).join("\n"),
        `Still on the list: ${remaining.length}`,
        remaining.map((t) => `- ${t.title}`).join("\n"),
      ].join("\n"),
    });
    return { summary: text };
  }),
});
