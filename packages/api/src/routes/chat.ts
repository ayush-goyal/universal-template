import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, toUIMessageStream, validateUIMessages } from "ai";
import { z } from "zod";

import { protectedProcedure } from "../trpc";

const chat = protectedProcedure
  .input(z.object({ messages: z.unknown() }))
  .mutation(async function* ({ input, signal }) {
    const messages = await validateUIMessages({ messages: input.messages });

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
