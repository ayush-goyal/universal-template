import { createDb, runWithDb } from "@acme/db/worker";

import type { ServerBindings } from "./app";
import app from "./app";

type WorkerBindings = ServerBindings & {
  DATABASE_DIRECT_URL: string;
};

type WorkerContext = NonNullable<Parameters<typeof app.fetch>[2]>;

export default {
  async fetch(request: Request, env: WorkerBindings, ctx: WorkerContext) {
    const database = createDb({
      connectionString: env.DATABASE_DIRECT_URL,
    });

    try {
      return await runWithDb(database, () => app.fetch(request, env, ctx));
    } finally {
      ctx.waitUntil(database.$disconnect());
    }
  },
};
