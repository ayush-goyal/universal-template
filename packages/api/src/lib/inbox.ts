import { db } from "@acme/db";

/**
 * Each user gets a single special "Inbox" project that cannot be deleted.
 * This helper lazily creates it on first access.
 */
export async function ensureInbox(userId: string) {
  const existing = await db.project.findFirst({
    where: { userId, isInbox: true },
  });
  if (existing) return existing;

  return db.project.create({
    data: {
      userId,
      name: "Inbox",
      color: "sage",
      isInbox: true,
      order: 0,
    },
  });
}
