import { PgBoss } from "pg-boss";

import { startEmailDeliveryWorker } from "../email/worker";

export type JobRegistration = {
  name: string;
  start: () => Promise<{ stop: () => Promise<void> }>;
};

let activeBoss: PgBoss | undefined;

export function getJobBoss(): PgBoss {
  if (!activeBoss) throw new Error("pg-boss has not started");
  return activeBoss;
}

const bossRegistration: JobRegistration = {
  name: "pg-boss",
  start: async () => {
    if (activeBoss) throw new Error("pg-boss is already running");
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is required for pg-boss");

    const boss = new PgBoss(connectionString);
    await boss.start({ attempts: 3 });
    activeBoss = boss;

    return {
      stop: async () => {
        activeBoss = undefined;
        await boss.stop({ graceful: true, timeout: 30_000 });
      },
    };
  },
};

// Imported only by the long-lived Node entry point. The email worker starts
// after pg-boss and uses the EmailMessage row as its durable source of truth.
export const jobRegistrations: readonly JobRegistration[] = [
  bossRegistration,
  { name: "customer-email", start: () => startEmailDeliveryWorker(getJobBoss()) },
];
