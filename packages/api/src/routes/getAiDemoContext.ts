import { db } from "@acme/db";

import { publicProcedure } from "../trpc";

const recommendedPrompts = [
  "Summarize how this starter uses Vercel AI SDK and tRPC.",
  "How many users are currently in the database?",
  "What app context can you read through the tRPC tool?",
];

const getAiDemoContext = publicProcedure.query(async ({ ctx }) => {
  const userCount = await db.user.count();

  return {
    userCount,
    signedIn: Boolean(ctx.user?.id),
    currentUserEmail: ctx.user?.email ?? null,
    providerAvailability: {
      aiGateway: Boolean(process.env.AI_GATEWAY_API_KEY),
      openai: Boolean(process.env.OPENAI_API_KEY),
    },
    recommendedPrompts,
  };
});

export default getAiDemoContext;
