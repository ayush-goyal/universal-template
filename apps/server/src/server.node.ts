import { serve } from "@hono/node-server";

import { db } from "@acme/db";

import type { JobRuntime } from "./jobs/runtime";
import app from "./app";
import { jobRegistrations } from "./jobs/registry";
import { startJobRuntime } from "./jobs/runtime";

const port = Number(process.env.PORT ?? 3001);

async function main() {
  if (!process.env.HONO_SERVICE_TOKEN) {
    throw new Error("HONO_SERVICE_TOKEN is required for the Node service");
  }

  let jobs: JobRuntime | undefined;
  try {
    // Compose waits for Postgres health, and this check keeps the HTTP listener
    // closed if the application itself still cannot reach the database.
    await db.$queryRaw`SELECT 1`;
    const runningJobs = await startJobRuntime(jobRegistrations);
    jobs = runningJobs;

    const server = serve({ fetch: app.fetch, port }, ({ port: listeningPort }) => {
      console.log(`Server running on http://localhost:${listeningPort}`);
    });

    let stopping: Promise<void> | undefined;
    const shutdown = () => {
      stopping ??= (async () => {
        try {
          await new Promise<void>((resolve, reject) => {
            server.close((error) => (error ? reject(error) : resolve()));
          });
          await runningJobs.stop();
        } finally {
          await db.$disconnect();
        }
      })();
      return stopping;
    };

    for (const signal of ["SIGINT", "SIGTERM"] as const) {
      process.once(signal, () => {
        void shutdown().catch((error: unknown) => {
          console.error("Server shutdown failed", error);
          process.exitCode = 1;
        });
      });
    }
  } catch (error) {
    try {
      await jobs?.stop();
    } finally {
      await db.$disconnect();
    }
    throw error;
  }
}

void main().catch((error: unknown) => {
  console.error("Server startup failed", error);
  process.exitCode = 1;
});
