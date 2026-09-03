import handler from "vinext/server/fetch-handler";

import type { Db } from "@acme/db/worker";
import { createDb, runWithDb } from "@acme/db/worker";

type WorkerContext = Parameters<typeof handler.fetch>[2];
type WebEnv = Parameters<typeof handler.fetch>[1] & {
  DATABASE_DIRECT_URL: string;
};

const disconnect = async (database: Db) => {
  try {
    await database.$disconnect();
  } catch (error) {
    console.error("Failed to disconnect Prisma:", error);
  }
};

const closeDatabaseWithResponse = (response: Response, database: Db, ctx: WorkerContext) => {
  if (!response.body) {
    ctx.waitUntil(disconnect(database));
    return response;
  }

  const reader = response.body.getReader();
  let disconnected = false;
  const disconnectOnce = async () => {
    if (disconnected) return;
    disconnected = true;
    await disconnect(database);
  };

  const body = new ReadableStream<Uint8Array>({
    async cancel(reason) {
      try {
        await runWithDb(database, () => reader.cancel(reason));
      } finally {
        await disconnectOnce();
      }
    },
    async pull(controller) {
      try {
        const chunk = await runWithDb(database, () => reader.read());
        if (chunk.done) {
          controller.close();
          await disconnectOnce();
          return;
        }
        controller.enqueue(chunk.value);
      } catch (error) {
        controller.error(error);
        await disconnectOnce();
      }
    },
  });

  return new Response(body, {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  });
};

export default {
  async fetch(request: Request, env: WebEnv, ctx: WorkerContext) {
    const database = createDb({
      connectionString: env.DATABASE_DIRECT_URL,
    });

    try {
      return await runWithDb(database, async () => {
        const response = await handler.fetch(request, env, ctx);
        return closeDatabaseWithResponse(response, database, ctx);
      });
    } catch (error) {
      ctx.waitUntil(disconnect(database));
      throw error;
    }
  },
};
