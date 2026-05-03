import type { UIMessage } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  tool,
} from "ai";
import { z } from "zod";

import { createCaller, createTRPCContext } from "@acme/api";

import {
  buildLocalDemoReply,
  chunkText,
  extractLatestUserText,
  FALLBACK_STREAM_DELAY_MS,
} from "@/lib/ai/chat";

export const maxDuration = 30;

const model = process.env.AI_GATEWAY_API_KEY
  ? gateway("openai/gpt-4.1-mini")
  : process.env.OPENAI_API_KEY
    ? openai("gpt-4.1-mini")
    : null;

const systemPrompt = [
  "You are the Vercel AI SDK example assistant for this starter repo.",
  "Answer concisely and clearly.",
  "Use the getAppContext tool whenever the user asks about the current app, auth state, or database-backed demo context.",
  "If the tool reports no signed-in user, say so plainly.",
].join(" ");

async function streamLocalDemo(messages: UIMessage[], requestHeaders: Headers) {
  const ctx = await createTRPCContext({ headers: requestHeaders });
  const caller = createCaller(ctx);
  const appContext = await caller.getAiDemoContext();
  const prompt = extractLatestUserText(messages);
  const demoReply = buildLocalDemoReply({
    prompt,
    appContext,
  });

  return createUIMessageStreamResponse({
    stream: createUIMessageStream({
      originalMessages: messages,
      async execute({ writer }) {
        writer.write({
          type: "text-start",
          id: "local-demo-text",
        });

        for (const chunk of chunkText(demoReply)) {
          writer.write({
            type: "text-delta",
            id: "local-demo-text",
            delta: chunk,
          });
          await new Promise((resolve) => setTimeout(resolve, FALLBACK_STREAM_DELAY_MS));
        }

        writer.write({
          type: "text-end",
          id: "local-demo-text",
        });
      },
    }),
  });
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  if (!model) {
    return streamLocalDemo(messages, req.headers);
  }

  const ctx = await createTRPCContext({ headers: req.headers });
  const caller = createCaller(ctx);

  const result = streamText({
    model,
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: {
      getAppContext: tool({
        description:
          "Read live application context from the existing tRPC backend, including user count, auth state, and recommended demo prompts.",
        inputSchema: z.object({
          includePrompts: z
            .boolean()
            .default(true)
            .describe("Whether the response should include the recommended starter prompts."),
        }),
        execute: async ({ includePrompts }) => {
          const appContext = await caller.getAiDemoContext();

          return includePrompts
            ? appContext
            : {
                ...appContext,
                recommendedPrompts: [],
              };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
