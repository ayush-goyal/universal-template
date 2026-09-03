import { AsyncLocalStorage } from "node:async_hooks";
import { PrismaPostgresAdapter } from "@prisma/adapter-ppg";

import { PrismaClient } from "../prisma/generated/workerd/client";

export type CreateDbOptions = {
  connectionString: string;
};

export const createDb = (options: CreateDbOptions) => {
  if (!options.connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  return new PrismaClient({
    adapter: new PrismaPostgresAdapter({
      connectionString: options.connectionString,
    }),
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
};

export type Db = ReturnType<typeof createDb>;

const databaseStorageKey = Symbol.for("acme.db.workerd.als");
const globalForDatabaseStorage = globalThis as unknown as Record<
  PropertyKey,
  AsyncLocalStorage<Db> | undefined
>;
const databaseStorage = (globalForDatabaseStorage[databaseStorageKey] ??=
  new AsyncLocalStorage<Db>());

export const runWithDb = <T>(database: Db, operation: () => T): T => {
  return databaseStorage.run(database, operation);
};

export const getDb = () => {
  const database = databaseStorage.getStore();
  if (!database) {
    throw new Error("Database accessed outside a Worker request");
  }
  return database;
};

export const db = new Proxy({} as Db, {
  get(_target, property) {
    const database = getDb();
    const value = Reflect.get(database, property, database);
    return typeof value === "function" ? value.bind(database) : value;
  },
});

export * from "../prisma/generated/workerd/client";
