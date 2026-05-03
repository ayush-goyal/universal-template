import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@acme/db";

import { COLORS } from "../lib/colors";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const ColorSchema = z.enum(COLORS);

export const labelsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.label.findMany({
      where: { userId: ctx.user.id },
      orderBy: { name: "asc" },
    });
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(60), color: ColorSchema.optional() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await db.label.create({
          data: {
            userId: ctx.user.id,
            name: input.name,
            color: input.color ?? "sage",
          },
        });
      } catch {
        throw new TRPCError({ code: "CONFLICT", message: "Label already exists" });
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(60).optional(),
        color: ColorSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const label = await db.label.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!label) throw new TRPCError({ code: "NOT_FOUND" });
      const { id, ...rest } = input;
      return db.label.update({ where: { id }, data: rest });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const label = await db.label.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!label) throw new TRPCError({ code: "NOT_FOUND" });
      await db.label.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
