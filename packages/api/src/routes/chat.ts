import { openai } from "@ai-sdk/openai";
import { TRPCError } from "@trpc/server";
import { convertToModelMessages, streamText, toUIMessageStream, validateUIMessages } from "ai";
import { z } from "zod";

import { consumeUsage, UsageLimitExceededError } from "@acme/billing";

import { protectedProcedure } from "../trpc";

const chat = protectedProcedure
  .input(z.object({ messages: z.unknown() }))
  .mutation(async function* ({ ctx, input, signal }) {
    const messages = await validateUIMessages({ messages: input.messages });

    // Charge the quota before spending money on the model. Pro is unlimited, so this is a no-op
    // there; on Free it is what makes the plan difference real rather than cosmetic.
    try {
      await consumeUsage(ctx.user.id, "aiMessagesPerDay", await ctx.getEntitlement());
    } catch (error) {
      if (error instanceof UsageLimitExceededError) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `You have used all ${error.status.limit} of today's messages. Upgrade to Pro for unlimited messages.`,
          cause: error,
        });
      }
      throw error;
    }

    const result = streamText({
      model: openai("gpt-4.1-mini"),
      instructions: "You are a helpful assistant.",
      messages: await convertToModelMessages(messages),
      abortSignal: signal,
    });

    const reader = toUIMessageStream({ stream: result.stream }).getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        yield value;
      }
    } finally {
      // Stops the upstream model call when the client disconnects mid-stream.
      await reader.cancel();
    }
  });

export default chat;
