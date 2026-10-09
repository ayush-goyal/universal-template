import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";

import { db } from "@acme/db";

async function bootstrapPlatformAdmin() {
  const email = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.PLATFORM_ADMIN_PASSWORD;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("PLATFORM_ADMIN_EMAIL must be a valid email address.");
  }
  if (!password || password.length < 8 || password.length > 72) {
    throw new Error("PLATFORM_ADMIN_PASSWORD must contain 8 to 72 characters.");
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    if (!existing.isPlatformAdmin) {
      throw new Error("That email already belongs to a non-platform user; refusing promotion.");
    }
    const credential = await db.account.findFirst({
      where: { userId: existing.id, providerId: "credential" },
    });
    if (!credential) throw new Error("Platform admin exists without a credential account.");
    console.log("Platform admin already exists.");
    return;
  }

  const now = new Date();
  const userId = randomUUID();
  const passwordHash = await hashPassword(password);

  await db.$transaction(async (tx) => {
    await tx.user.create({
      data: {
        id: userId,
        name: "Platform Admin",
        email,
        emailVerified: true,
        isPlatformAdmin: true,
        createdAt: now,
        updatedAt: now,
      },
    });
    await tx.account.create({
      data: {
        id: randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      },
    });
  });

  console.log("Platform admin created.");
}

bootstrapPlatformAdmin()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Platform bootstrap failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
